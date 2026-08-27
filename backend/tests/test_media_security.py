"""Upload validation — the most common route to a stored-file vulnerability."""

from __future__ import annotations

import io

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.mediahub.models import MediaAsset
from apps.mediahub.services import validate_image

pytestmark = pytest.mark.django_db

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 64


def _upload(name: str, content: bytes, content_type: str) -> SimpleUploadedFile:
    return SimpleUploadedFile(name, content, content_type=content_type)


def test_valid_png_is_accepted():
    assert validate_image(_upload("a.png", PNG, "image/png")) == "image/png"


def test_script_disguised_as_an_image_is_rejected():
    """A declared Content-Type is attacker-controlled; the bytes are checked."""
    payload = b"<?php system($_GET['c']); ?>"
    with pytest.raises(ValueError, match="valid image"):
        validate_image(_upload("shell.png", payload, "image/png"))


def test_disallowed_type_is_rejected():
    with pytest.raises(ValueError, match="not an accepted image type"):
        validate_image(_upload("doc.pdf", b"%PDF-1.4", "application/pdf"))


def test_svg_is_rejected():
    """SVG can carry script; it is deliberately not in the allow-list."""
    with pytest.raises(ValueError):
        validate_image(_upload("x.svg", b"<svg onload=alert(1)>", "image/svg+xml"))


def test_empty_file_is_rejected():
    with pytest.raises(ValueError, match="empty"):
        validate_image(_upload("empty.png", b"", "image/png"))


def test_oversized_file_is_rejected(settings):
    settings.MAX_UPLOAD_BYTES = 100
    with pytest.raises(ValueError, match="limit"):
        validate_image(_upload("big.png", PNG + b"\x00" * 500, "image/png"))


def test_upload_requires_media_edit_capability(auth, viewer):
    response = auth(viewer).post(
        "/api/admin/media/", {"file": _upload("a.png", PNG, "image/png")}, format="multipart"
    )
    assert response.status_code == 403


def test_upload_stores_an_asset(auth, content_manager):
    response = auth(content_manager).post(
        "/api/admin/media/",
        {"file": _upload("drum.png", PNG, "image/png"), "alt_text": "A blue drum"},
        format="multipart",
    )
    assert response.status_code == 201
    asset = MediaAsset.objects.get(pk=response.data["id"])
    assert asset.alt_text == "A blue drum"
    assert asset.uploaded_by == content_manager


def test_asset_in_use_cannot_be_deleted(auth, content_manager, publishable_product, image):
    response = auth(content_manager).delete(f"/api/admin/media/{image.pk}/")
    assert response.status_code == 400
    assert "still used" in str(response.data)
    assert MediaAsset.objects.filter(pk=image.pk).exists()


def test_secrets_are_never_serialised(auth, content_manager, image, settings):
    settings.CLOUDINARY_API_SECRET = "super-secret-value"
    body = str(auth(content_manager).get(f"/api/admin/media/{image.pk}/").data)
    assert "super-secret-value" not in body
