"""
Deterministic content/SEO quality scoring.

This is NOT a ranking prediction and must never be presented as one. It is a
weighted checklist: every point is traceable to a named check with a stated
threshold, so the same record always scores the same and an operator can see
exactly why. An LLM is never asked to invent a number.

Adding a check means adding it to CHECKS — the weights are normalised, so the
score stays 0-100 automatically.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Callable, Iterable

from .models import SeoIssueSeverity

# Google truncates around these; they are guidance, not hard limits.
TITLE_MIN, TITLE_IDEAL_MAX, TITLE_MAX = 20, 60, 70
DESC_MIN, DESC_IDEAL_MAX, DESC_MAX = 70, 160, 180
DESCRIPTION_MIN_WORDS = 60
SHORT_DESC_MIN_WORDS = 12


@dataclass
class Issue:
    code: str
    severity: str
    message: str
    field: str = ""

    def as_dict(self) -> dict:
        return {
            "code": self.code,
            "severity": self.severity,
            "message": self.message,
            "field": self.field,
        }


@dataclass
class CheckResult:
    #: 0.0-1.0 — how fully this check passed.
    ratio: float
    issues: list[Issue] = field(default_factory=list)


@dataclass
class Check:
    code: str
    weight: int
    run: Callable[[object], CheckResult]


def _words(text: str) -> int:
    return len([w for w in re.split(r"\s+", (text or "").strip()) if w])


def _ok() -> CheckResult:
    return CheckResult(1.0)


def _fail(code: str, message: str, *, severity=SeoIssueSeverity.WARNING, field_name="", ratio=0.0):
    return CheckResult(ratio, [Issue(code, severity, message, field_name)])


# --------------------------------------------------------------------------- #
# Individual checks. Each receives the object under test and returns a ratio.
# Messages are actionable: they say what to do, not that something is "weak".
# --------------------------------------------------------------------------- #


def check_title(obj) -> CheckResult:
    title = (getattr(obj, "seo_title", "") or "").strip()
    if not title:
        return _fail(
            "title_missing",
            "Add an SEO title. Without one the public page falls back to the "
            "record name, which rarely matches how buyers search.",
            severity=SeoIssueSeverity.CRITICAL,
            field_name="seo_title",
        )
    length = len(title)
    if length < TITLE_MIN:
        return _fail(
            "title_short",
            f"The SEO title is {length} characters. Aim for {TITLE_MIN}-{TITLE_IDEAL_MAX} "
            "so it describes the product and its context.",
            field_name="seo_title",
            ratio=0.5,
        )
    if length > TITLE_MAX:
        return _fail(
            "title_long",
            f"The SEO title is {length} characters and will be truncated in results. "
            f"Trim it to {TITLE_IDEAL_MAX} or fewer.",
            field_name="seo_title",
            ratio=0.5,
        )
    if length > TITLE_IDEAL_MAX:
        return CheckResult(
            0.8,
            [
                Issue(
                    "title_slightly_long",
                    SeoIssueSeverity.INFO,
                    f"The SEO title is {length} characters; {TITLE_IDEAL_MAX} or fewer displays more reliably.",
                    "seo_title",
                )
            ],
        )
    return _ok()


def check_meta_description(obj) -> CheckResult:
    desc = (getattr(obj, "meta_description", "") or "").strip()
    if not desc:
        return _fail(
            "description_missing",
            "Add a meta description. Search engines will otherwise excerpt "
            "arbitrary page text, which reads poorly in results.",
            severity=SeoIssueSeverity.CRITICAL,
            field_name="meta_description",
        )
    length = len(desc)
    if length < DESC_MIN:
        return _fail(
            "description_short",
            f"The meta description is {length} characters. Aim for {DESC_MIN}-{DESC_IDEAL_MAX} "
            "to give buyers a reason to click.",
            field_name="meta_description",
            ratio=0.5,
        )
    if length > DESC_MAX:
        return _fail(
            "description_long",
            f"The meta description is {length} characters and will be cut off. "
            f"Trim it to {DESC_IDEAL_MAX} or fewer.",
            field_name="meta_description",
            ratio=0.5,
        )
    return _ok()


def check_slug(obj) -> CheckResult:
    slug = getattr(obj, "slug", "") or ""
    if not slug:
        return _fail(
            "slug_missing",
            "Add a URL slug.",
            severity=SeoIssueSeverity.CRITICAL,
            field_name="slug",
        )
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug):
        return _fail(
            "slug_format",
            "The URL slug should be lowercase words separated by single hyphens.",
            field_name="slug",
        )
    if len(slug) > 75:
        return CheckResult(
            0.6,
            [
                Issue(
                    "slug_long",
                    SeoIssueSeverity.INFO,
                    f"The slug is {len(slug)} characters. Shorter URLs are easier to read and share.",
                    "slug",
                )
            ],
        )
    return _ok()


def check_content_depth(obj) -> CheckResult:
    body = getattr(obj, "description", None)
    if body is None and hasattr(obj, "plain_text"):
        body = obj.plain_text()
    count = _words(body or "")
    if count == 0:
        return _fail(
            "content_missing",
            "Add a full description. A page with only a one-line summary gives "
            "buyers and search engines almost nothing to work with.",
            severity=SeoIssueSeverity.CRITICAL,
            field_name="description",
        )
    if count < DESCRIPTION_MIN_WORDS:
        return _fail(
            "content_thin",
            f"The description is {count} words. Aim for at least {DESCRIPTION_MIN_WORDS}, "
            "covering what the product is and its confirmed applications.",
            field_name="description",
            ratio=count / DESCRIPTION_MIN_WORDS,
        )
    return _ok()


def check_short_description(obj) -> CheckResult:
    text = getattr(obj, "short_description", None)
    if text is None:
        text = getattr(obj, "summary", "")
    count = _words(text or "")
    if count == 0:
        return _fail(
            "summary_missing",
            "Add a short summary — it is used on cards, listings and as a meta fallback.",
            field_name="short_description",
        )
    if count < SHORT_DESC_MIN_WORDS:
        return CheckResult(
            0.6,
            [
                Issue(
                    "summary_thin",
                    SeoIssueSeverity.INFO,
                    f"The summary is {count} words; around {SHORT_DESC_MIN_WORDS}+ reads better in listings.",
                    "short_description",
                )
            ],
        )
    return _ok()


def check_image(obj) -> CheckResult:
    image = getattr(obj, "primary_image", None) or getattr(obj, "featured_image", None)
    if image is None:
        return _fail(
            "image_missing",
            "Add a product image. Pages without one lose rich-result eligibility "
            "and convert worse.",
            field_name="primary_image",
        )
    if not (image.alt_text or "").strip():
        return _fail(
            "image_alt_missing",
            "Add alt text to the image describing what it shows. This is required "
            "for screen readers and used by image search.",
            field_name="primary_image",
            ratio=0.4,
        )
    return _ok()


def check_internal_links(obj) -> CheckResult:
    """A product with no category or industry is an orphan in the link graph."""
    if not hasattr(obj, "category"):
        return _ok()

    issues: list[Issue] = []
    score = 1.0
    if getattr(obj, "category_id", None) is None:
        issues.append(
            Issue(
                "no_category",
                SeoIssueSeverity.CRITICAL,
                "Assign a category. Without one this page has no contextual internal "
                "link from the catalogue and is effectively orphaned.",
                "category",
            )
        )
        score -= 0.6
    if obj.pk and not obj.industries.exists():
        issues.append(
            Issue(
                "no_industry",
                SeoIssueSeverity.WARNING,
                "Link this product to at least one industry so sector pages reference it.",
                "industries",
            )
        )
        score -= 0.4
    return CheckResult(max(score, 0.0), issues)


def check_keyword(obj) -> CheckResult:
    keyword = (getattr(obj, "primary_keyword", "") or "").strip().lower()
    if not keyword:
        return _fail(
            "keyword_missing",
            "Set a primary keyword so title and description can be checked against "
            "the search intent this page targets.",
            severity=SeoIssueSeverity.INFO,
            field_name="primary_keyword",
            ratio=0.0,
        )
    title = (getattr(obj, "seo_title", "") or "").lower()
    desc = (getattr(obj, "meta_description", "") or "").lower()
    hits = sum([keyword in title, keyword in desc])
    if hits == 0:
        return _fail(
            "keyword_absent",
            f'The primary keyword "{keyword}" appears in neither the SEO title nor '
            "the meta description. Work it into at least one, naturally.",
            field_name="primary_keyword",
            ratio=0.2,
        )
    return CheckResult(1.0 if hits == 2 else 0.7)


def check_indexability(obj) -> CheckResult:
    """
    Noindex is legitimate — but silently noindexing a *published, verified*
    record is almost always a mistake, so it is surfaced.
    """
    if not getattr(obj, "robots_index", True) and getattr(obj, "is_public", False):
        return _fail(
            "noindex_on_public",
            "This record is published and verified but set to noindex, so it will "
            "not appear in search. Enable indexing or unpublish it.",
            severity=SeoIssueSeverity.CRITICAL,
            field_name="robots_index",
        )
    return _ok()


def check_structured_data(obj) -> CheckResult:
    if not getattr(obj, "schema_type", ""):
        return _fail(
            "schema_missing",
            "Set a structured-data type so the page emits valid schema.org markup.",
            severity=SeoIssueSeverity.INFO,
            field_name="schema_type",
        )
    return _ok()


def check_technical_identity(obj) -> CheckResult:
    """Product-only: a chemical page without identity data is thin by definition."""
    if not hasattr(obj, "technical_dict"):
        return _ok()
    filled = len(obj.technical_dict())
    if filled == 0:
        return _fail(
            "technical_empty",
            "No technical identity is recorded (CAS number, formula, grade, purity "
            "or packaging). Add whatever has been confirmed — buyers search on these.",
            field_name="cas_number",
        )
    if filled < 3:
        return CheckResult(
            0.6,
            [
                Issue(
                    "technical_sparse",
                    SeoIssueSeverity.INFO,
                    f"Only {filled} technical field(s) recorded. Adding confirmed grade, "
                    "purity or packaging strengthens the page.",
                    "grade",
                )
            ],
        )
    return _ok()


PRODUCT_CHECKS: list[Check] = [
    Check("title", 14, check_title),
    Check("meta_description", 14, check_meta_description),
    Check("slug", 6, check_slug),
    Check("content_depth", 16, check_content_depth),
    Check("short_description", 6, check_short_description),
    Check("image", 10, check_image),
    Check("internal_links", 12, check_internal_links),
    Check("keyword", 8, check_keyword),
    Check("indexability", 6, check_indexability),
    Check("structured_data", 4, check_structured_data),
    Check("technical_identity", 4, check_technical_identity),
]

GENERIC_CHECKS: list[Check] = [
    Check("title", 20, check_title),
    Check("meta_description", 20, check_meta_description),
    Check("slug", 10, check_slug),
    Check("content_depth", 24, check_content_depth),
    Check("short_description", 8, check_short_description),
    Check("image", 6, check_image),
    Check("keyword", 6, check_keyword),
    Check("indexability", 4, check_indexability),
    Check("structured_data", 2, check_structured_data),
]


def score_object(obj, checks: Iterable[Check] | None = None) -> tuple[int, list[dict]]:
    """
    Run every check and return ``(score_0_to_100, issues)``.

    A check that raises is treated as a non-blocking failure: scoring must never
    take down a save.
    """
    if checks is None:
        checks = PRODUCT_CHECKS if hasattr(obj, "technical_dict") else GENERIC_CHECKS
    checks = list(checks)

    total_weight = sum(c.weight for c in checks) or 1
    earned = 0.0
    issues: list[dict] = []

    for check in checks:
        try:
            result = check.run(obj)
        except Exception:  # pragma: no cover - defensive
            continue
        earned += max(0.0, min(1.0, result.ratio)) * check.weight
        issues.extend(i.as_dict() for i in result.issues)

    return round(earned / total_weight * 100), issues


SEVERITY_ORDER = {
    SeoIssueSeverity.CRITICAL: 0,
    SeoIssueSeverity.WARNING: 1,
    SeoIssueSeverity.INFO: 2,
}


def health_band(score: int, issues: list[dict]) -> str:
    """Bucket a record for the SEO health dashboard."""
    if any(i["severity"] == SeoIssueSeverity.CRITICAL for i in issues) or score < 50:
        return "critical"
    if score < 80:
        return "needs_attention"
    return "healthy"
