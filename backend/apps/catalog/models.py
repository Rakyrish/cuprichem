"""
Catalogue models — categories, industries, applications and products.

Two orthogonal flags govern visibility, and both must be satisfied:

  * ``status``   — the editorial workflow position (draft → … → published)
  * ``verified`` — whether Cuprichem has CONFIRMED the record as fact

A record can be finished editorially yet still unverified; it is then reachable
but excluded from the sitemap and rendered noindex, so unconfirmed technical
claims never enter the index. `is_public` is the single expression of that rule.

Technical fields carry a parallel confidence map (`field_confidence`) because
values may originate from image OCR. A value the admin typed is HIGH by
definition; a value a model read off a label is not.
"""

from __future__ import annotations

from django.core.validators import MinLengthValidator
from django.db import models

from apps.core.models import (
    PUBLIC_STATUSES,
    ContentOrigin,
    PublishStatus,
    TimeStampedModel,
)
from apps.seo.models import SchemaType, SeoFieldsMixin


class Confidence(models.TextChoices):
    HIGH = "high", "High"
    MEDIUM = "medium", "Medium"
    LOW = "low", "Low"
    UNKNOWN = "unknown", "Unknown"


class PublishableQuerySet(models.QuerySet):
    def public(self):
        return self.filter(status=PublishStatus.PUBLISHED, verified=True)

    def indexable(self):
        return self.public().filter(robots_index=True)


class Category(TimeStampedModel, SeoFieldsMixin):
    slug = models.SlugField(max_length=220, unique=True, db_index=True)
    name = models.CharField(max_length=200, validators=[MinLengthValidator(2)])
    summary = models.CharField(max_length=400, blank=True)
    intro = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, choices=PublishStatus.choices, default=PublishStatus.DRAFT, db_index=True
    )
    verified = models.BooleanField(default=False, db_index=True)
    image = models.ForeignKey(
        "mediahub.MediaAsset", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    display_order = models.PositiveIntegerField(default=0, db_index=True)

    objects = PublishableQuerySet.as_manager()

    class Meta:
        ordering = ["display_order", "name"]
        verbose_name_plural = "categories"

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs):
        if not self.schema_type or self.schema_type == SchemaType.WEB_PAGE:
            self.schema_type = SchemaType.COLLECTION_PAGE
        super().save(*args, **kwargs)

    @property
    def is_public(self) -> bool:
        return self.status in PUBLIC_STATUSES and self.verified

    @property
    def public_path(self) -> str:
        return f"/categories/{self.slug}"


class Industry(TimeStampedModel, SeoFieldsMixin):
    slug = models.SlugField(max_length=220, unique=True, db_index=True)
    name = models.CharField(max_length=200, validators=[MinLengthValidator(2)])
    summary = models.CharField(max_length=400, blank=True)
    intro = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, choices=PublishStatus.choices, default=PublishStatus.DRAFT, db_index=True
    )
    verified = models.BooleanField(default=False, db_index=True)
    image = models.ForeignKey(
        "mediahub.MediaAsset", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    display_order = models.PositiveIntegerField(default=0, db_index=True)

    objects = PublishableQuerySet.as_manager()

    class Meta:
        ordering = ["display_order", "name"]
        verbose_name_plural = "industries"

    def __str__(self) -> str:
        return self.name

    @property
    def is_public(self) -> bool:
        return self.status in PUBLIC_STATUSES and self.verified

    @property
    def public_path(self) -> str:
        return f"/industries/{self.slug}"


class Application(TimeStampedModel):
    """A use-case a product serves ("Water disinfection"). Shared across products."""

    slug = models.SlugField(max_length=220, unique=True, db_index=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Product(TimeStampedModel, SeoFieldsMixin):
    slug = models.SlugField(max_length=220, unique=True, db_index=True)
    name = models.CharField(max_length=250, validators=[MinLengthValidator(2)])
    synonyms = models.JSONField(default=list, blank=True)

    category = models.ForeignKey(
        Category, null=True, blank=True, on_delete=models.PROTECT, related_name="products"
    )
    industries = models.ManyToManyField(Industry, blank=True, related_name="products")
    applications = models.ManyToManyField(Application, blank=True, related_name="products")
    related_products = models.ManyToManyField("self", blank=True, symmetrical=False)

    short_description = models.CharField(max_length=500, blank=True)
    description = models.TextField(blank=True)
    procurement_notes = models.TextField(blank=True)

    # --- Technical identity. Every field optional; blank means "not confirmed". ---
    cas_number = models.CharField(max_length=60, blank=True, db_index=True)
    formula = models.CharField(max_length=120, blank=True)
    molecular_weight = models.CharField(max_length=60, blank=True)
    grade = models.CharField(max_length=120, blank=True)
    purity = models.CharField(max_length=120, blank=True)
    appearance = models.CharField(max_length=200, blank=True)
    packaging = models.JSONField(default=list, blank=True)
    manufacturer = models.CharField(max_length=200, blank=True)

    #: {field_name: "high"|"medium"|"low"|"unknown"}. Absent means the value was
    #: entered by a human and is therefore treated as HIGH.
    field_confidence = models.JSONField(default=dict, blank=True)
    #: Field names an administrator has explicitly confirmed. AI may never
    #: overwrite these — see services.apply_ai_payload.
    verified_fields = models.JSONField(default=list, blank=True)

    faqs = models.JSONField(default=list, blank=True)

    primary_image = models.ForeignKey(
        "mediahub.MediaAsset", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )

    status = models.CharField(
        max_length=20, choices=PublishStatus.choices, default=PublishStatus.DRAFT, db_index=True
    )
    verified = models.BooleanField(default=False, db_index=True)
    content_origin = models.CharField(
        max_length=20, choices=ContentOrigin.choices, default=ContentOrigin.HUMAN
    )

    published_at = models.DateTimeField(null=True, blank=True, db_index=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )

    objects = PublishableQuerySet.as_manager()

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["status", "verified"]),
            models.Index(fields=["-updated_at"]),
            models.Index(fields=["seo_score"]),
        ]

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs):
        if not self.schema_type or self.schema_type == SchemaType.WEB_PAGE:
            self.schema_type = SchemaType.PRODUCT
        super().save(*args, **kwargs)

    @property
    def is_public(self) -> bool:
        return self.status in PUBLIC_STATUSES and self.verified

    @property
    def public_path(self) -> str:
        return f"/products/{self.slug}"

    def confidence_for(self, field: str) -> str:
        if field in (self.verified_fields or []):
            return Confidence.HIGH
        return (self.field_confidence or {}).get(field, Confidence.HIGH)

    def technical_dict(self) -> dict[str, object]:
        """Only the technical fields that actually hold a value."""
        raw = {
            "cas_number": self.cas_number,
            "formula": self.formula,
            "molecular_weight": self.molecular_weight,
            "grade": self.grade,
            "purity": self.purity,
            "appearance": self.appearance,
            "packaging": self.packaging,
            "manufacturer": self.manufacturer,
        }
        return {k: v for k, v in raw.items() if v}


class ProductRedirect(TimeStampedModel):
    """
    What a retired product URL should do.

    Unpublishing must be a deliberate decision, never a blanket redirect to the
    homepage — that destroys link equity and misleads visitors. A row here is
    created whenever a published product leaves the index.
    """

    class Mode(models.TextChoices):
        GONE = "410", "410 Gone (permanently withdrawn)"
        NOT_FOUND = "404", "404 Not found"
        REDIRECT = "301", "301 Redirect to replacement"

    from_path = models.CharField(max_length=300, unique=True, db_index=True)
    mode = models.CharField(max_length=8, choices=Mode.choices, default=Mode.GONE)
    to_path = models.CharField(max_length=300, blank=True)
    reason = models.CharField(max_length=300, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.from_path} -> {self.mode}"
