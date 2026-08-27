"""Shared model primitives."""

from __future__ import annotations

from django.db import models
from django.utils.text import slugify


class TimeStampedModel(models.Model):
    """Created/updated stamps on everything that can change."""

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True, db_index=True)

    class Meta:
        abstract = True


class PublishStatus(models.TextChoices):
    """
    Explicit lifecycle for every publishable record.

    AI output enters at AI_GENERATED and can only reach PUBLISHED by passing
    through human review — see apps.catalog.services.publish_product, which is
    the single place a record is allowed to become publicly visible.
    """

    DRAFT = "draft", "Draft"
    AI_GENERATED = "ai_generated", "AI generated"
    NEEDS_REVIEW = "needs_review", "Needs review"
    APPROVED = "approved", "Approved"
    PUBLISHED = "published", "Published"
    UNPUBLISHED = "unpublished", "Unpublished"
    ARCHIVED = "archived", "Archived"


#: Statuses that are allowed to appear on the public website.
PUBLIC_STATUSES = {PublishStatus.PUBLISHED}


class ContentOrigin(models.TextChoices):
    """
    Provenance of a record's content — surfaced in the admin so an operator can
    always tell what a human verified versus what a model proposed.
    """

    HUMAN = "human", "Human authored"
    AI_GENERATED = "ai_generated", "AI generated"
    AI_ASSISTED = "ai_assisted", "AI assisted"
    HUMAN_EDITED = "human_edited", "Human edited"
    HUMAN_APPROVED = "human_approved", "Human approved"


def unique_slug(model: type[models.Model], value: str, *, instance_pk=None) -> str:
    """
    Slugify `value`, then suffix until unique.

    The database also carries a unique constraint; this exists so the API can
    resolve a collision cleanly instead of surfacing an IntegrityError.
    """
    base = slugify(value)[:200] or "item"
    candidate = base
    counter = 2
    while True:
        qs = model.objects.filter(slug=candidate)
        if instance_pk is not None:
            qs = qs.exclude(pk=instance_pk)
        if not qs.exists():
            return candidate
        suffix = f"-{counter}"
        candidate = f"{base[: 200 - len(suffix)]}{suffix}"
        counter += 1
