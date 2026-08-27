"""
Media storage.

Files arrive at Django, are validated, then pushed to Cloudinary server-side.
The browser never receives an API secret and never signs an upload, so the
credential cannot be extracted from the admin bundle.

When Cloudinary is not configured the file is stored locally instead of failing,
so the catalogue remains usable in development and during an outage.
"""

from __future__ import annotations

import logging
import os
import uuid

from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import UploadedFile

from apps.core.exceptions import ServiceUnavailable

logger = logging.getLogger("cuprichem.media")

#: Magic bytes, checked because a Content-Type header is attacker-controlled.
_SIGNATURES: tuple[tuple[bytes, str], ...] = (
    (b"\xff\xd8\xff", "image/jpeg"),
    (b"\x89PNG\r\n\x1a\n", "image/png"),
    (b"RIFF", "image/webp"),
)


def cloudinary_configured() -> bool:
    return bool(
        settings.CLOUDINARY_CLOUD_NAME
        and settings.CLOUDINARY_API_KEY
        and settings.CLOUDINARY_API_SECRET
    )


def validate_image(upload: UploadedFile) -> str:
    """
    Validate an uploaded image and return its detected content type.

    Both the declared type and the file's own signature must be acceptable —
    trusting the header alone would let a script be uploaded as `image/png`.
    """
    if upload.size > settings.MAX_UPLOAD_BYTES:
        raise ValueError(
            f"The file is {upload.size // 1024} KB; the limit is "
            f"{settings.MAX_UPLOAD_BYTES // 1024} KB."
        )
    if upload.size == 0:
        raise ValueError("The file is empty.")

    declared = (upload.content_type or "").lower()
    if declared not in settings.ALLOWED_IMAGE_TYPES:
        raise ValueError(
            f"'{declared or 'unknown'}' is not an accepted image type. "
            f"Allowed: {', '.join(settings.ALLOWED_IMAGE_TYPES)}."
        )

    head = upload.read(16)
    upload.seek(0)
    detected = next((mime for sig, mime in _SIGNATURES if head.startswith(sig)), "")

    # AVIF/WebP share an ISO-BMFF-ish container; accept when the header agrees.
    if not detected and declared in ("image/avif", "image/webp") and b"ftyp" in head:
        detected = declared

    if not detected:
        raise ValueError("The file does not appear to be a valid image.")
    return detected


def upload_image(upload: UploadedFile, *, folder: str | None = None) -> dict:
    """Store an image and return normalised metadata."""
    content_type = validate_image(upload)

    if cloudinary_configured():
        return _upload_to_cloudinary(upload, content_type, folder)
    return _upload_locally(upload, content_type)


def _upload_to_cloudinary(upload: UploadedFile, content_type: str, folder: str | None) -> dict:
    try:
        import cloudinary
        import cloudinary.uploader
    except ImportError as exc:  # pragma: no cover
        raise ServiceUnavailable(
            "The Cloudinary SDK is not installed on the server.", code="cloudinary_sdk_missing"
        ) from exc

    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )
    try:
        result = cloudinary.uploader.upload(
            upload,
            folder=folder or settings.CLOUDINARY_FOLDER,
            resource_type="image",
            # Let Cloudinary negotiate format and quality per request; this is
            # what makes responsive delivery work without storing variants.
            fetch_format="auto",
            quality="auto",
        )
    except Exception as exc:
        logger.exception("Cloudinary upload failed")
        raise ServiceUnavailable(
            "The image could not be uploaded to Cloudinary. Please retry.",
            code="cloudinary_upload_failed",
        ) from exc

    return {
        "public_id": result.get("public_id", ""),
        "secure_url": result.get("secure_url", ""),
        "width": result.get("width"),
        "height": result.get("height"),
        "byte_size": result.get("bytes", upload.size),
        "content_type": content_type,
        "local_path": "",
    }


def _upload_locally(upload: UploadedFile, content_type: str) -> dict:
    extension = os.path.splitext(upload.name or "")[1][:10] or ".bin"
    name = f"media/{uuid.uuid4().hex}{extension}"
    path = default_storage.save(name, upload)
    return {
        "public_id": "",
        "secure_url": default_storage.url(path),
        "width": None,
        "height": None,
        "byte_size": upload.size,
        "content_type": content_type,
        "local_path": path,
    }


def delete_asset(asset) -> None:
    """Remove the stored file. The database row is deleted by the caller."""
    if asset.public_id and cloudinary_configured():
        try:
            import cloudinary
            import cloudinary.uploader

            cloudinary.config(
                cloud_name=settings.CLOUDINARY_CLOUD_NAME,
                api_key=settings.CLOUDINARY_API_KEY,
                api_secret=settings.CLOUDINARY_API_SECRET,
                secure=True,
            )
            cloudinary.uploader.destroy(asset.public_id)
        except Exception:
            # Never block the delete on a remote failure; log for cleanup.
            logger.warning("Cloudinary delete failed for %s", asset.public_id, exc_info=True)
    elif asset.local_path:
        try:
            default_storage.delete(asset.local_path)
        except Exception:
            logger.warning("Local delete failed for %s", asset.local_path, exc_info=True)
