"""Articles and resources."""

from __future__ import annotations

from django.db import models

from apps.core.models import (
    PUBLIC_STATUSES,
    ContentOrigin,
    PublishStatus,
    TimeStampedModel,
)
from apps.seo.models import SchemaType, SeoFieldsMixin


class Article(TimeStampedModel, SeoFieldsMixin):
    slug = models.SlugField(max_length=220, unique=True, db_index=True)
    title = models.CharField(max_length=250)
    summary = models.CharField(max_length=500, blank=True)

    #: Typed blocks, never raw HTML — the public renderer maps block types to
    #: components, so stored content cannot inject markup into the page.
    body = models.JSONField(default=list, blank=True)

    featured_image = models.ForeignKey(
        "mediahub.MediaAsset", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    author = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="articles"
    )
    related_categories = models.ManyToManyField(
        "catalog.Category", blank=True, related_name="articles"
    )

    status = models.CharField(
        max_length=20, choices=PublishStatus.choices, default=PublishStatus.DRAFT, db_index=True
    )
    verified = models.BooleanField(default=False, db_index=True)
    content_origin = models.CharField(
        max_length=20, choices=ContentOrigin.choices, default=ContentOrigin.HUMAN
    )

    date_published = models.DateField(null=True, blank=True, db_index=True)
    date_modified = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["-date_published", "-created_at"]

    def __str__(self) -> str:
        return self.title

    def save(self, *args, **kwargs):
        if not self.schema_type or self.schema_type == SchemaType.WEB_PAGE:
            self.schema_type = SchemaType.ARTICLE
        super().save(*args, **kwargs)

    @property
    def is_public(self) -> bool:
        return self.status in PUBLIC_STATUSES and self.verified

    @property
    def public_path(self) -> str:
        return f"/resources/{self.slug}"

    def plain_text(self) -> str:
        """Flatten the block body for word-count and duplication checks."""
        parts: list[str] = []
        for block in self.body or []:
            if not isinstance(block, dict):
                continue
            if block.get("type") == "list":
                parts.extend(str(i) for i in block.get("items", []))
            elif block.get("text"):
                parts.append(str(block["text"]))
        return " ".join(parts)
