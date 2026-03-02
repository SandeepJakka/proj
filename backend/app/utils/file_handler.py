"""
file_handler.py
───────────────
Utilities for handling file uploads in Healthora.

Phase 0 additions:
  • validate_upload_file() — validates extension, MIME type, and file size.
    Uses python-magic for real MIME detection (not just extension sniffing).
"""

import os
import magic          # python-magic — real MIME type detection
from uuid import uuid4
from fastapi import HTTPException, UploadFile, status
from app.config import settings

# ── Upload directory ──────────────────────────────────────────────────────────
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ── Allowed file types ────────────────────────────────────────────────────────
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf"}

# MIME types that map to the allowed extensions
ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "application/pdf",
}

# Maximum upload size (from config, defaulting to 10 MB)
MAX_FILE_SIZE_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024   # 10 * 1024 * 1024 = 10 MB


# ── Validation helper ─────────────────────────────────────────────────────────

async def validate_upload_file(file: UploadFile) -> bytes:
    """
    Validate an uploaded file for:
      1. Allowed file extension (.jpg, .jpeg, .png, .pdf)
      2. Maximum file size (10 MB)
      3. Actual MIME type via python-magic (prevents extension spoofing)

    Args:
        file: FastAPI UploadFile object.

    Returns:
        Raw file bytes (already read, so callers don't need to re-read).

    Raises:
        HTTPException 400: If the file extension or MIME type is not allowed.
        HTTPException 413: If the file exceeds the maximum size limit.
    """
    # 1. Check extension
    filename   = file.filename or ""
    _, ext     = os.path.splitext(filename.lower())

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"File type '{ext}' is not allowed. "
                f"Accepted formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            ),
        )

    # 2. Read file content (we need it for size check + MIME detection)
    file_bytes = await file.read()

    # 3. Check file size
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                f"File size exceeds the {settings.MAX_UPLOAD_SIZE_MB} MB limit. "
                f"Received: {len(file_bytes) / (1024 * 1024):.2f} MB"
            ),
        )

    # 4. Detect actual MIME type from file header bytes (magic bytes check)
    detected_mime = magic.from_buffer(file_bytes[:2048], mime=True)

    if detected_mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"File content detected as '{detected_mime}' which is not allowed. "
                f"Accepted MIME types: {', '.join(sorted(ALLOWED_MIME_TYPES))}"
            ),
        )

    return file_bytes


# ── Save helper (EXISTING — preserved) ───────────────────────────────────────

def save_upload(file) -> tuple[str, str]:
    """
    Save an uploaded file to the UPLOAD_DIR with a UUID filename.

    Returns:
        (path, extension_lower) — path to the saved file and lowercase extension.
    """
    ext  = file.filename.split(".")[-1]
    name = f"{uuid4()}.{ext}"
    path = os.path.join(UPLOAD_DIR, name)
    with open(path, "wb") as f:
        f.write(file.file.read())
    return path, ext.lower()


async def save_upload_bytes(file_bytes: bytes, original_filename: str) -> tuple[str, str]:
    """
    Save pre-read file bytes to UPLOAD_DIR.
    Use this when validate_upload_file() has already read the bytes.

    Returns:
        (path, extension_lower)
    """
    ext  = original_filename.split(".")[-1]
    name = f"{uuid4()}.{ext}"
    path = os.path.join(UPLOAD_DIR, name)
    with open(path, "wb") as f:
        f.write(file_bytes)
    return path, ext.lower()
