from datetime import datetime, timedelta
from typing import Optional, Any

from litestar import Router, get, post, patch, delete, Request
from litestar.exceptions import NotFoundException, ClientException

from db import SessionLocal
from models import Deadline
from schemas import DeadlineCreate, DeadlineUpdate, DeadlineResponse, StatusType
from routes.auth import require_auth


def deadline_to_response(d: Deadline) -> DeadlineResponse:
    """Convert ORM model to response schema."""
    return DeadlineResponse(
        id=d.id,
        title=d.title,
        deadline=d.deadline,
        description=d.description,
        project=d.project,
        status=d.status,
        url=d.url,
        tags=d.tags,
        created_at=d.created_at,
        updated_at=d.updated_at,
    )


@get("/")
async def list_deadlines(
    request: Request[Any, Any, Any],
    days: Optional[int] = None,
    status: Optional[StatusType] = None,
    project: Optional[str] = None,
) -> list[DeadlineResponse]:
    """List deadlines with optional filters."""
    require_auth(request)

    db = SessionLocal()
    try:
        query = db.query(Deadline)

        if days is not None:
            cutoff = datetime.utcnow() + timedelta(days=days)
            query = query.filter(Deadline.deadline <= cutoff)

        if status is not None:
            query = query.filter(Deadline.status == status)

        if project is not None:
            query = query.filter(Deadline.project == project)

        query = query.order_by(Deadline.deadline.asc())

        return [deadline_to_response(d) for d in query.all()]
    finally:
        db.close()


@get("/upcoming")
async def upcoming_deadlines(
    request: Request[Any, Any, Any],
    days: int = 7,
) -> list[DeadlineResponse]:
    """Get upcoming deadlines within N days (default 7)."""
    require_auth(request)

    db = SessionLocal()
    try:
        now = datetime.utcnow()
        cutoff = now + timedelta(days=days)

        deadlines = (
            db.query(Deadline)
            .filter(
                Deadline.deadline >= now,
                Deadline.deadline <= cutoff,
                Deadline.status.in_(["watching", "active"]),
            )
            .order_by(Deadline.deadline.asc())
            .all()
        )

        return [deadline_to_response(d) for d in deadlines]
    finally:
        db.close()


@post("/")
async def create_deadline(
    data: DeadlineCreate,
    request: Request[Any, Any, Any],
) -> DeadlineResponse:
    """Create a new deadline."""
    require_auth(request)

    db = SessionLocal()
    try:
        # Check if ID already exists
        existing = db.query(Deadline).filter(Deadline.id == data.id).first()
        if existing:
            raise ClientException(f"Deadline with id '{data.id}' already exists", status_code=409)

        deadline = Deadline(
            id=data.id,
            title=data.title,
            deadline=data.deadline,
            description=data.description,
            project=data.project,
            status=data.status,
            url=data.url,
        )
        deadline.tags = data.tags

        db.add(deadline)
        db.commit()
        db.refresh(deadline)

        return deadline_to_response(deadline)
    finally:
        db.close()


@get("/{deadline_id:str}")
async def get_deadline(
    deadline_id: str,
    request: Request[Any, Any, Any],
) -> DeadlineResponse:
    """Get a single deadline by ID."""
    require_auth(request)

    db = SessionLocal()
    try:
        deadline = db.query(Deadline).filter(Deadline.id == deadline_id).first()
        if deadline is None:
            raise NotFoundException(f"Deadline '{deadline_id}' not found")

        return deadline_to_response(deadline)
    finally:
        db.close()


@patch("/{deadline_id:str}")
async def update_deadline(
    deadline_id: str,
    data: DeadlineUpdate,
    request: Request[Any, Any, Any],
) -> DeadlineResponse:
    """Update a deadline (partial update)."""
    require_auth(request)

    db = SessionLocal()
    try:
        deadline = db.query(Deadline).filter(Deadline.id == deadline_id).first()
        if deadline is None:
            raise NotFoundException(f"Deadline '{deadline_id}' not found")

        update_data = data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            if field == "tags":
                deadline.tags = value
            else:
                setattr(deadline, field, value)

        db.commit()
        db.refresh(deadline)

        return deadline_to_response(deadline)
    finally:
        db.close()


@delete("/{deadline_id:str}", status_code=204)
async def delete_deadline(
    deadline_id: str,
    request: Request[Any, Any, Any],
) -> None:
    """Delete a deadline."""
    require_auth(request)

    db = SessionLocal()
    try:
        deadline = db.query(Deadline).filter(Deadline.id == deadline_id).first()
        if deadline is None:
            raise NotFoundException(f"Deadline '{deadline_id}' not found")

        db.delete(deadline)
        db.commit()
    finally:
        db.close()


deadlines_router = Router(path="/deadlines", route_handlers=[
    list_deadlines, upcoming_deadlines, create_deadline,
    get_deadline, update_deadline, delete_deadline
])
