from litestar import Litestar, get, Request
from litestar.config.cors import CORSConfig
from typing import Any

from config import TRANSFERS_DIR
from datetime import datetime, UTC
from db import init_db, SessionLocal
from models import EndpointStat, UserSession
from routes.auth import auth_router
from routes.transfers import transfers_router


def record_hit(request: Request[Any, Any, Any]) -> None:
    """Increment the hit count for the requested endpoint."""
    key = f"{request.method} {request.scope['path']}"
    db = SessionLocal()
    try:
        stat = db.get(EndpointStat, key)
        if stat:
            stat.count += 1
        else:
            db.add(EndpointStat(endpoint=key, count=1))
        db.commit()
    finally:
        db.close()


@get("/health")
async def health_check() -> dict:
    """Health check endpoint."""
    return {"status": "ok"}


@get("/stats")
async def stats() -> dict:
    """Return per-endpoint hit counts."""
    db = SessionLocal()
    try:
        rows = db.query(EndpointStat).all()
        return {row.endpoint: row.count for row in rows}
    finally:
        db.close()


def _cleanup_expired_sessions():
    db = SessionLocal()
    try:
        db.query(UserSession).filter(UserSession.expires_at < datetime.now(UTC).replace(tzinfo=None)).delete()
        db.commit()
    finally:
        db.close()


cors_config = CORSConfig(
    allow_origins=["https://shelf.mutantcacti.com"],
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
    allow_credentials=True,
)

app = Litestar(
    route_handlers=[health_check, stats, auth_router, transfers_router],
    cors_config=cors_config,
    before_request=record_hit,
    on_startup=[lambda: (init_db(), TRANSFERS_DIR.mkdir(parents=True, exist_ok=True), __import__('config').THUMBS_DIR.mkdir(parents=True, exist_ok=True), _cleanup_expired_sessions())],
    request_max_body_size=1024 * 1024 * 1024,  # 1GB
    debug=False,
)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
