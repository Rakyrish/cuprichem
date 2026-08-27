"""
SEO metadata as first-class data.

`SeoFieldsMixin` is mixed into every publishable model. Where a field is blank
the public site derives a sensible value at render time (Next.js metadata),
so the rule is: **stored value wins; blank means derive**. That keeps one clear
source of truth and avoids duplicating fallback logic on both sides.
"""

from __future__ import annotations

from django.db import models


class SchemaType(models.TextChoices):
    PRODUCT = "Product", "Product"
    ARTICLE = "Article", "Article"
    COLLECTION_PAGE = "CollectionPage", "Collection page"
    WEB_PAGE = "WebPage", "Web page"


class SeoFieldsMixin(models.Model):
    seo_title = models.CharField(max_length=180, blank=True)
    meta_description = models.CharField(max_length=320, blank=True)
    canonical_url = models.URLField(max_length=500, blank=True)

    robots_index = models.BooleanField(default=True)
    robots_follow = models.BooleanField(default=True)

    og_title = models.CharField(max_length=180, blank=True)
    og_description = models.CharField(max_length=320, blank=True)
    og_image = models.URLField(max_length=500, blank=True)

    schema_type = models.CharField(
        max_length=32, choices=SchemaType.choices, default=SchemaType.WEB_PAGE
    )

    primary_keyword = models.CharField(max_length=120, blank=True)
    secondary_keywords = models.JSONField(default=list, blank=True)

    #: Deterministic 0-100 quality score, recomputed on save by the scoring
    #: engine. Explicitly a CONTENT QUALITY score, not a ranking prediction.
    seo_score = models.PositiveSmallIntegerField(default=0, db_index=True)
    seo_issues = models.JSONField(default=list, blank=True)
    seo_checked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True


class SeoIssueSeverity(models.TextChoices):
    CRITICAL = "critical", "Critical"
    WARNING = "warning", "Warning"
    INFO = "info", "Info"
