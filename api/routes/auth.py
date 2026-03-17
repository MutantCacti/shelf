import hashlib
import secrets
from datetime import datetime, timedelta, UTC

from litestar import Router, post, get, delete, Request
from litestar.exceptions import NotAuthorizedException, NotFoundException, ClientException
from litestar.response import Response
from typing import Any
import bcrypt

from db import SessionLocal
from models import User, ApiKey, UserSession
from schemas import (
    LoginRequest, LoginResponse,
    ChangePasswordRequest, ChangePasswordResponse,
    ApiKeyCreate, ApiKeyResponse, ApiKeyCreated
)
from config import SESSION_COOKIE_NAME, SESSION_MAX_AGE


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against a hash."""
    return bcrypt.checkpw(password.encode(), hashed.encode())


def hash_token(token: str) -> str:
    """Hash a high-entropy token with SHA-256 for O(1) indexed lookup."""
    return hashlib.sha256(token.encode()).hexdigest()


def validate_session_token(token: str) -> int | None:
    """Validate session token against database. Returns user_id or None."""
    db = SessionLocal()
    try:
        session = db.query(UserSession).filter(
            UserSession.token_hash == hash_token(token)
        ).first()
        if session is None:
            return None
        if session.expires_at > datetime.now(UTC).replace(tzinfo=None):
            return session.user_id
        # Expired - delete it
        db.delete(session)
        db.commit()
        return None
    finally:
        db.close()


def require_auth(request: Request[Any, Any, Any]) -> int:
    """Dependency to require authentication. Returns user_id."""
    # Check session cookie first
    session_token = request.cookies.get(SESSION_COOKIE_NAME)
    if session_token:
        user_id = validate_session_token(session_token)
        if user_id is not None:
            return user_id

    # Check API key
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        key = auth_header[7:]
        db = SessionLocal()
        try:
            api_key = db.query(ApiKey).filter(
                ApiKey.key_hash == hash_token(key)
            ).first()
            if api_key:
                api_key.last_used = datetime.now(UTC).replace(tzinfo=None)
                db.commit()
                return api_key.user_id
        finally:
            db.close()

    raise NotAuthorizedException("Authentication required")


@post("/login")
async def login(data: LoginRequest) -> Response[LoginResponse]:
    """Login with password, returns session cookie."""
    db = SessionLocal()
    try:
        db.query(UserSession).filter(UserSession.expires_at < datetime.now(UTC).replace(tzinfo=None)).delete()

        # Iterate all users, match by password
        matched_user = None
        for user in db.query(User).all():
            if verify_password(data.password, user.password_hash):
                matched_user = user
                break

        if matched_user is None:
            raise NotAuthorizedException("Invalid password")

        # Create session token and store hash in DB
        session_token = secrets.token_urlsafe(32)
        token_hash = hash_token(session_token)
        expires_at = datetime.now(UTC).replace(tzinfo=None) + timedelta(seconds=SESSION_MAX_AGE)

        session_record = UserSession(
            token_hash=token_hash,
            user_id=matched_user.id,
            expires_at=expires_at,
        )
        db.add(session_record)
        db.commit()

        response = Response(
            LoginResponse(),
            status_code=200,
        )
        response.set_cookie(
            key=SESSION_COOKIE_NAME,
            value=session_token,
            max_age=SESSION_MAX_AGE,
            httponly=True,
            secure=True,
            samesite="lax",
        )
        return response
    finally:
        db.close()


@post("/logout")
async def logout(request: Request[Any, Any, Any]) -> Response:
    """Clear session cookie and invalidate server-side session."""
    session_token = request.cookies.get(SESSION_COOKIE_NAME)
    if session_token:
        db = SessionLocal()
        try:
            session = db.query(UserSession).filter(
                UserSession.token_hash == hash_token(session_token)
            ).first()
            if session:
                db.delete(session)
                db.commit()
        finally:
            db.close()

    response = Response({"message": "logged out"}, status_code=200)
    response.delete_cookie(SESSION_COOKIE_NAME)
    return response


@post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    request: Request[Any, Any, Any],
) -> Response[ChangePasswordResponse]:
    """Change the current user's password. Invalidates all sessions."""
    user_id = require_auth(request)

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if user is None:
            raise NotAuthorizedException("User not found")

        if not verify_password(data.current_password, user.password_hash):
            raise ClientException("Current password is incorrect", status_code=400)

        # Ensure new password is unique across all users
        for other in db.query(User).filter(User.id != user_id).all():
            if verify_password(data.new_password, other.password_hash):
                raise ClientException("Password is already in use", status_code=409)

        user.password_hash = hash_password(data.new_password)

        # Invalidate all existing sessions
        db.query(UserSession).filter(UserSession.user_id == user_id).delete()

        # Issue a fresh session
        session_token = secrets.token_urlsafe(32)
        expires_at = datetime.now(UTC).replace(tzinfo=None) + timedelta(seconds=SESSION_MAX_AGE)
        db.add(UserSession(
            token_hash=hash_token(session_token),
            user_id=user_id,
            expires_at=expires_at,
        ))
        db.commit()

        response = Response(
            ChangePasswordResponse(),
            status_code=200,
        )
        response.set_cookie(
            key=SESSION_COOKIE_NAME,
            value=session_token,
            max_age=SESSION_MAX_AGE,
            httponly=True,
            secure=True,
            samesite="lax",
        )
        return response
    finally:
        db.close()


@post("/api-keys")
async def create_api_key(
    data: ApiKeyCreate,
    request: Request[Any, Any, Any],
) -> ApiKeyCreated:
    """Create a new API key. Returns the key once (not stored)."""
    user_id = require_auth(request)

    db = SessionLocal()
    try:
        raw_key = secrets.token_urlsafe(32)
        key_hash = hash_token(raw_key)

        api_key = ApiKey(
            key_hash=key_hash,
            user_id=user_id,
            name=data.name,
        )
        db.add(api_key)
        db.commit()
        db.refresh(api_key)

        return ApiKeyCreated(
            id=api_key.id,
            name=api_key.name,
            created_at=api_key.created_at,
            last_used=api_key.last_used,
            key=raw_key,
        )
    finally:
        db.close()


@get("/api-keys")
async def list_api_keys(
    request: Request[Any, Any, Any],
) -> list[ApiKeyResponse]:
    """List all API keys for the current user."""
    user_id = require_auth(request)

    db = SessionLocal()
    try:
        keys = db.query(ApiKey).filter(ApiKey.user_id == user_id).all()
        return [
            ApiKeyResponse(
                id=k.id,
                name=k.name,
                created_at=k.created_at,
                last_used=k.last_used,
            )
            for k in keys
        ]
    finally:
        db.close()


@delete("/api-keys/{key_id:int}", status_code=204)
async def delete_api_key(
    key_id: int,
    request: Request[Any, Any, Any],
) -> None:
    """Delete an API key owned by the current user."""
    user_id = require_auth(request)

    db = SessionLocal()
    try:
        api_key = db.query(ApiKey).filter(
            ApiKey.id == key_id, ApiKey.user_id == user_id
        ).first()
        if api_key is None:
            raise NotFoundException("API key not found")

        db.delete(api_key)
        db.commit()
    finally:
        db.close()


@get("/check")
async def check_auth(request: Request[Any, Any, Any]) -> dict:
    """Check if the current session is authenticated."""
    require_auth(request)
    return {"authenticated": True}


auth_router = Router(path="/auth", route_handlers=[
    login, logout, check_auth, change_password,
    create_api_key, list_api_keys, delete_api_key
])
