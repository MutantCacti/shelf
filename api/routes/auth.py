import secrets
from datetime import datetime, timedelta

from litestar import Router, post, get, delete, Request
from litestar.exceptions import NotAuthorizedException, NotFoundException
from litestar.response import Response
from typing import Any
import bcrypt

from db import SessionLocal
from models import Auth, ApiKey, UserSession
from schemas import (
    LoginRequest, LoginResponse,
    ApiKeyCreate, ApiKeyResponse, ApiKeyCreated
)
from config import SESSION_COOKIE_NAME, SESSION_MAX_AGE


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against a hash."""
    return bcrypt.checkpw(password.encode(), hashed.encode())


def validate_session_token(token: str) -> bool:
    """Validate session token against database."""
    db = SessionLocal()
    try:
        token_hash = hash_password(token)
        # Check all sessions (can't reverse hash)
        for session in db.query(UserSession).all():
            if verify_password(token, session.token_hash):
                if session.expires_at > datetime.utcnow():
                    return True
                # Expired - delete it
                db.delete(session)
                db.commit()
                return False
        return False
    finally:
        db.close()


def require_auth(request: Request[Any, Any, Any]) -> bool:
    """Dependency to require authentication."""
    # Check session cookie first
    session_token = request.cookies.get(SESSION_COOKIE_NAME)
    if session_token and validate_session_token(session_token):
        return True

    # Check API key
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        key = auth_header[7:]
        db = SessionLocal()
        try:
            for api_key in db.query(ApiKey).all():
                if verify_password(key, api_key.key_hash):
                    api_key.last_used = datetime.utcnow()
                    db.commit()
                    return True
        finally:
            db.close()

    raise NotAuthorizedException("Authentication required")


@post("/login")
async def login(data: LoginRequest) -> Response[LoginResponse]:
    """Login with password, returns session cookie."""
    db = SessionLocal()
    try:
        auth = db.query(Auth).first()
        if auth is None:
            raise NotAuthorizedException("No user configured")

        if not verify_password(data.password, auth.password_hash):
            raise NotAuthorizedException("Invalid password")

        # Create session token and store hash in DB
        session_token = secrets.token_urlsafe(32)
        token_hash = hash_password(session_token)
        expires_at = datetime.utcnow() + timedelta(seconds=SESSION_MAX_AGE)

        session_record = UserSession(
            token_hash=token_hash,
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
            # Find and delete the session
            for session in db.query(UserSession).all():
                if verify_password(session_token, session.token_hash):
                    db.delete(session)
                    db.commit()
                    break
        finally:
            db.close()

    response = Response({"message": "logged out"}, status_code=200)
    response.delete_cookie(SESSION_COOKIE_NAME)
    return response


@post("/api-keys")
async def create_api_key(
    data: ApiKeyCreate,
    request: Request[Any, Any, Any],
) -> ApiKeyCreated:
    """Create a new API key. Returns the key once (not stored)."""
    require_auth(request)

    db = SessionLocal()
    try:
        # Generate key
        raw_key = secrets.token_urlsafe(32)
        key_hash = hash_password(raw_key)

        api_key = ApiKey(
            key_hash=key_hash,
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
    """List all API keys (without the actual keys)."""
    require_auth(request)

    db = SessionLocal()
    try:
        keys = db.query(ApiKey).all()
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
    """Delete an API key."""
    require_auth(request)

    db = SessionLocal()
    try:
        api_key = db.query(ApiKey).filter(ApiKey.id == key_id).first()
        if api_key is None:
            raise NotFoundException("API key not found")

        db.delete(api_key)
        db.commit()
    finally:
        db.close()


auth_router = Router(path="/auth", route_handlers=[
    login, logout, create_api_key, list_api_keys, delete_api_key
])
