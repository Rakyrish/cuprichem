"""
Media library.

Files are uploaded to Django, pushed to Cloudinary, and only the resulting
secure URL is stored. Cloudinary credentials stay server-side — the browser
never signs or uploads anything directly.
"""

from __future__ import annotations

from django.db import models

from apps.core.models import TimeStampedModel


class MediaAsset(TimeStampedModel):
    class Kind(models.TextChoices):
        IMAGE = "image", "Image"
        DOCUMENT = "document", "Document"

    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.IMAGE)

    #: Cloudinary public id — needed to build transformations and to delete.
    public_id = models.CharField(max_length=300, blank=True, db_index=True)
    secure_url = models.URLField(max_length=600)

    original_filename = models.CharField(max_length=255, blank=True)
    content_type = models.CharField(max_length=100, blank=True)
    byte_size = models.PositiveIntegerField(default=0)
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)

    #: Empty alt text is an accessibility AND an SEO defect; the SEO engine
    #: flags any published product whose primary image lacks it.
    alt_text = models.CharField(max_length=300, blank=True)
    caption = models.CharField(max_length=300, blank=True)

    uploaded_by = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )

    #: Set when the file lives on local disk because Cloudinary is unconfigured.
    local_path = models.CharField(max_length=500, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.original_filename or self.secure_url

    @property
    def usage_count(self) -> int:
        """How many records point at this asset — checked before deletion."""
        from apps.catalog.models import Category, Industry, Product
        from apps.content.models import Article

        return (
            Product.objects.filter(primary_image=self).count()
            + Category.objects.filter(image=self).count()
            + Industry.objects.filter(image=self).count()
            + Article.objects.filter(featured_image=self).count()
        )
