import io
import mimetypes
import os
import zipfile
from typing import Any

from PIL import Image, ImageOps

from litestar import Router, get, post, patch, delete, Request
from litestar.datastructures import UploadFile
from litestar.datastructures.headers import CacheControlHeader
from litestar.enums import RequestEncodingType
from litestar.exceptions import NotFoundException, ClientException
from litestar.params import Body
from litestar.response import File, Response, Stream

from config import TRANSFERS_DIR, THUMBS_DIR
from db import SessionLocal
from models import Transfer
from routes.auth import require_auth
from schemas import BatchDeleteRequest, TransferCreate, TransferRename, TransferResponse

MAX_FILE_SIZE = 1024 * 1024 * 1024  # 1GB per file
MAX_USER_STORAGE = 1024 * 1024 * 1024  # 1GB total per user
STREAM_CHUNK_SIZE = 64 * 1024  # 64KB


def user_storage_bytes(user_id: int) -> int:
    """Total bytes used by a user's file transfers on disk."""
    d = TRANSFERS_DIR / str(user_id)
    if not d.exists():
        return 0
    return sum(f.stat().st_size for f in d.iterdir() if f.is_file())


def user_transfers_dir(user_id: int):
    d = TRANSFERS_DIR / str(user_id)
    d.mkdir(parents=True, exist_ok=True)
    return d


def user_thumbs_dir(user_id: int):
    d = THUMBS_DIR / str(user_id)
    d.mkdir(parents=True, exist_ok=True)
    return d


def transfer_to_response(t: Transfer) -> TransferResponse:
    """Convert ORM model to response schema."""
    size = None
    if t.type == "file":
        path = user_transfers_dir(t.user_id) / str(t.id)
        try:
            size = os.path.getsize(path)
        except OSError:
            size = None

    return TransferResponse(
        id=t.id,
        type=t.type,
        content=t.content,
        created_at=t.created_at,
        size=size,
    )


@post("/")
async def create_text_transfer(
    data: TransferCreate,
    request: Request[Any, Any, Any],
) -> TransferResponse:
    """Create a text transfer from JSON body."""
    user_id = require_auth(request)

    if data.type != "text":
        raise ClientException(
            "Use multipart form upload for file transfers",
            status_code=400,
        )

    db = SessionLocal()
    try:
        transfer = Transfer(type="text", content=data.content, user_id=user_id)
        db.add(transfer)
        db.commit()
        db.refresh(transfer)

        return transfer_to_response(transfer)
    finally:
        db.close()


@post("/upload")
async def create_file_transfer(
    request: Request[Any, Any, Any],
    data: UploadFile = Body(media_type=RequestEncodingType.MULTI_PART),
) -> TransferResponse:
    """Create a file transfer from multipart upload, streaming to disk."""
    user_id = require_auth(request)

    original_filename = data.filename or "unnamed"

    current_usage = user_storage_bytes(user_id)
    if current_usage >= MAX_USER_STORAGE:
        raise ClientException("Storage limit reached (1GB)", status_code=413)

    db = SessionLocal()
    try:
        transfer = Transfer(type="file", content=original_filename, user_id=user_id)
        db.add(transfer)
        db.commit()
        db.refresh(transfer)

        file_path = user_transfers_dir(user_id) / str(transfer.id)
        written = 0
        try:
            with open(file_path, "wb") as f:
                while chunk := await data.read(STREAM_CHUNK_SIZE):
                    written += len(chunk)
                    if written > MAX_FILE_SIZE:
                        raise ClientException("File exceeds 1GB limit", status_code=413)
                    if current_usage + written > MAX_USER_STORAGE:
                        raise ClientException("Storage limit reached (1GB)", status_code=413)
                    f.write(chunk)
        except ClientException:
            try:
                os.remove(file_path)
            except OSError:
                pass
            db.delete(transfer)
            db.commit()
            raise

        generate_thumbnail(transfer.id, user_id, file_path, original_filename)

        return transfer_to_response(transfer)
    finally:
        db.close()


@get("/", cache_control=CacheControlHeader(no_store=True))
async def list_transfers(
    request: Request[Any, Any, Any],
) -> list[TransferResponse]:
    """List all transfers for the current user, newest first."""
    user_id = require_auth(request)

    db = SessionLocal()
    try:
        transfers = (
            db.query(Transfer)
            .filter(Transfer.user_id == user_id)
            .order_by(Transfer.created_at.desc())
            .all()
        )
        return [transfer_to_response(t) for t in transfers]
    finally:
        db.close()


@delete("/{transfer_id:int}", status_code=204)
async def delete_transfer(
    transfer_id: int,
    request: Request[Any, Any, Any],
) -> None:
    """Delete a transfer owned by the current user."""
    user_id = require_auth(request)

    db = SessionLocal()
    try:
        transfer = db.query(Transfer).filter(
            Transfer.id == transfer_id, Transfer.user_id == user_id
        ).first()
        if transfer is None:
            raise NotFoundException(f"Transfer {transfer_id} not found")

        # Collect file paths before deleting DB record
        file_paths = []
        if transfer.type == "file":
            file_paths.append(user_transfers_dir(user_id) / str(transfer.id))
            file_paths.append(user_thumbs_dir(user_id) / f"{transfer.id}.webp")

        db.delete(transfer)
        db.commit()

        # Best-effort file cleanup after DB commit
        for path in file_paths:
            try:
                os.remove(path)
            except OSError:
                pass
    finally:
        db.close()


@post("/batch-delete", status_code=204)
async def batch_delete_transfers(
    data: BatchDeleteRequest,
    request: Request[Any, Any, Any],
) -> None:
    """Delete multiple transfers owned by the current user."""
    user_id = require_auth(request)

    db = SessionLocal()
    try:
        transfers = db.query(Transfer).filter(
            Transfer.id.in_(data.ids), Transfer.user_id == user_id
        ).all()

        # Collect all file paths before deleting DB records
        file_paths = []
        for transfer in transfers:
            if transfer.type == "file":
                file_paths.append(user_transfers_dir(user_id) / str(transfer.id))
                file_paths.append(user_thumbs_dir(user_id) / f"{transfer.id}.webp")
            db.delete(transfer)
        db.commit()

        # Best-effort file cleanup after DB commit
        for path in file_paths:
            try:
                os.remove(path)
            except OSError:
                pass
    finally:
        db.close()


@get("/{transfer_id:int}/download")
async def download_transfer(
    transfer_id: int,
    request: Request[Any, Any, Any],
) -> Response | File:
    """Download a transfer owned by the current user."""
    user_id = require_auth(request)

    db = SessionLocal()
    try:
        transfer = db.query(Transfer).filter(
            Transfer.id == transfer_id, Transfer.user_id == user_id
        ).first()
        if transfer is None:
            raise NotFoundException(f"Transfer {transfer_id} not found")

        if transfer.type == "text":
            return Response(content=transfer.content, media_type="text/plain")

        file_path = user_transfers_dir(user_id) / str(transfer.id)
        if not file_path.exists():
            raise NotFoundException("File not found on disk")

        mime_type, _ = mimetypes.guess_type(transfer.content)
        if mime_type is None:
            mime_type = "application/octet-stream"

        return File(
            path=file_path,
            filename=transfer.content,
            media_type=mime_type,
            headers={"Cache-Control": "no-cache"},
        )
    finally:
        db.close()


@post("/batch-download")
async def batch_download_transfers(
    data: BatchDeleteRequest,
    request: Request[Any, Any, Any],
) -> Stream:
    """Download multiple file transfers as a streaming zip."""
    user_id = require_auth(request)

    db = SessionLocal()
    try:
        transfers = (
            db.query(Transfer)
            .filter(Transfer.id.in_(data.ids), Transfer.user_id == user_id, Transfer.type == "file")
            .all()
        )
        if not transfers:
            raise NotFoundException("No downloadable files found")

        transfers_dir = user_transfers_dir(user_id)
        names: dict[str, int] = {}
        file_entries: list[tuple[str, str]] = []
        for t in transfers:
            name = t.content
            if name in names:
                names[name] += 1
                base, ext = os.path.splitext(name)
                name = f"{base} ({names[name]}){ext}"
            else:
                names[name] = 0
            file_entries.append((str(transfers_dir / str(t.id)), name))
    finally:
        db.close()

    async def zip_generator():
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            for disk_path, arc_name in file_entries:
                if os.path.exists(disk_path):
                    zf.write(disk_path, arc_name)
        buf.seek(0)
        while chunk := buf.read(STREAM_CHUNK_SIZE):
            yield chunk

    return Stream(
        zip_generator(),
        media_type="application/zip",
        headers={
            "Content-Disposition": 'attachment; filename="transfers.zip"',
        },
    )


THUMB_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".pdf"}
THUMB_SIZE = (150, 150)
THUMB_QUALITY = 35


def generate_thumbnail(transfer_id: int, user_id: int, source_path, filename: str) -> bool:
    """Generate a cached WebP thumbnail. Returns True on success."""
    ext = os.path.splitext(filename)[1].lower()
    if ext not in THUMB_EXTS:
        return False

    try:
        if ext == ".pdf":
            import pymupdf
            doc = pymupdf.open(source_path)
            page = doc[0]
            # Scale to fit THUMB_SIZE while maintaining aspect ratio
            scale = min(THUMB_SIZE[0] / page.rect.width, THUMB_SIZE[1] / page.rect.height)
            mat = pymupdf.Matrix(scale, scale)
            pix = page.get_pixmap(matrix=mat)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            doc.close()
        elif ext == ".svg":
            import cairosvg
            from io import BytesIO
            png_data = cairosvg.svg2png(url=str(source_path), output_width=THUMB_SIZE[0], output_height=THUMB_SIZE[1])
            img = Image.open(BytesIO(png_data))
        else:
            img = Image.open(source_path)

            # JPEG draft mode: decode at reduced resolution directly from DCT
            if img.format == "JPEG":
                img.draft("RGB", THUMB_SIZE)

            img = ImageOps.exif_transpose(img)

        img.thumbnail(THUMB_SIZE, Image.BILINEAR)

        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGB")

        thumb_path = user_thumbs_dir(user_id) / f"{transfer_id}.webp"
        img.save(thumb_path, format="WEBP", quality=THUMB_QUALITY, method=0)
        return True
    except Exception:
        return False


@get("/{transfer_id:int}/thumbnail")
async def thumbnail_transfer(
    transfer_id: int,
    request: Request[Any, Any, Any],
) -> Response | File:
    """Serve a cached low-quality thumbnail for image transfers."""
    user_id = require_auth(request)

    thumbs_dir = user_thumbs_dir(user_id)
    thumb_path = thumbs_dir / f"{transfer_id}.webp"

    # Serve from cache
    if thumb_path.exists():
        return File(
            path=thumb_path,
            media_type="image/webp",
            headers={"Cache-Control": "no-cache"},
        )

    # Generate on demand (first request for pre-existing transfers)
    db = SessionLocal()
    try:
        transfer = db.query(Transfer).filter(
            Transfer.id == transfer_id, Transfer.user_id == user_id
        ).first()
        if transfer is None:
            raise NotFoundException(f"Transfer {transfer_id} not found")

        if transfer.type != "file":
            raise ClientException("Thumbnails only available for file transfers", status_code=400)

        file_path = user_transfers_dir(user_id) / str(transfer.id)
        if not file_path.exists():
            raise NotFoundException("File not found on disk")

        if not generate_thumbnail(transfer.id, user_id, file_path, transfer.content):
            raise ClientException("Thumbnails only available for images", status_code=400)

        return File(
            path=thumb_path,
            media_type="image/webp",
            headers={"Cache-Control": "no-cache"},
        )
    finally:
        db.close()


@patch("/{transfer_id:int}")
async def rename_transfer(
    transfer_id: int,
    data: TransferRename,
    request: Request[Any, Any, Any],
) -> TransferResponse:
    """Rename a transfer (update display name or text content)."""
    user_id = require_auth(request)
    db = SessionLocal()
    try:
        transfer = db.query(Transfer).filter(
            Transfer.id == transfer_id, Transfer.user_id == user_id
        ).first()
        if transfer is None:
            raise NotFoundException(f"Transfer {transfer_id} not found")
        transfer.content = data.content
        db.commit()
        db.refresh(transfer)
        return transfer_to_response(transfer)
    finally:
        db.close()


@get("/usage")
async def storage_usage(
    request: Request[Any, Any, Any],
) -> dict:
    """Return current storage usage and limit for the authenticated user."""
    user_id = require_auth(request)
    transfers_dir = user_transfers_dir(user_id)
    used = 0
    if transfers_dir.exists():
        for f in transfers_dir.iterdir():
            if f.is_file():
                used += f.stat().st_size
    return {"used": used, "limit": 1024 * 1024 * 1024}


transfers_router = Router(path="/transfers", route_handlers=[
    create_text_transfer, create_file_transfer, list_transfers,
    rename_transfer, delete_transfer, batch_delete_transfers,
    batch_download_transfers, download_transfer, thumbnail_transfer,
    storage_usage,
])
