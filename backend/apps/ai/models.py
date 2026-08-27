"""
AI job and generation records.

Everything a model produces is stored here FIRST and applied to a product only
after a human accepts it. That is what makes "AI cannot auto-publish" a
structural property of the system rather than a convention someone can forget.
"""

from __future__ import annotations

from django.db import models

from apps.core.models import TimeStampedModel


class AIOperation(models.TextChoices):
    IMAGE_ANALYZE = "image_analyze", "Analyse product image"
    PRODUCT_GENERATE = "product_generate", "Generate product content"
    SEO_GENERATE = "seo_generate", "Generate SEO metadata"
    CONTENT_IMPROVE = "content_improve", "Improve existing content"
    CONTENT_REVIEW = "content_review", "Review content quality"


class AIJobStatus(models.TextChoices):
    QUEUED = "queued", "Queued"
    PROCESSING = "processing", "Processing"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"
    CANCELLED = "cancelled", "Cancelled"


class ReviewState(models.TextChoices):
    PENDING = "pending", "Pending review"
    ACCEPTED = "accepted", "Accepted"
    REJECTED = "rejected", "Rejected"
    PARTIAL = "partial", "Partially accepted"


class AIJob(TimeStampedModel):
    operation = models.CharField(max_length=32, choices=AIOperation.choices, db_index=True)
    status = models.CharField(
        max_length=20, choices=AIJobStatus.choices, default=AIJobStatus.QUEUED, db_index=True
    )

    requested_by = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="ai_jobs"
    )
    product = models.ForeignKey(
        "catalog.Product", null=True, blank=True, on_delete=models.CASCADE, related_name="ai_jobs"
    )

    #: Redacted summary of what was sent — enough to reproduce a decision,
    #: never credentials.
    input_summary = models.JSONField(default=dict, blank=True)
    #: Validated, schema-conformant model output. Never applied automatically.
    result = models.JSONField(default=dict, blank=True)

    review_state = models.CharField(
        max_length=20, choices=ReviewState.choices, default=ReviewState.PENDING, db_index=True
    )
    reviewed_by = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    model_name = models.CharField(max_length=100, blank=True)
    prompt_version = models.CharField(max_length=60, blank=True)

    prompt_tokens = models.PositiveIntegerField(default=0)
    completion_tokens = models.PositiveIntegerField(default=0)
    total_tokens = models.PositiveIntegerField(default=0)

    error_code = models.CharField(max_length=80, blank=True)
    error_message = models.TextField(blank=True)

    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["operation", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.operation} [{self.status}]"

    @property
    def duration_seconds(self) -> float | None:
        if self.started_at and self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None
