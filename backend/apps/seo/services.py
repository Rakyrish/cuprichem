"""SEO scoring, duplicate detection and publish-gate validation."""

from __future__ import annotations

from collections import defaultdict

from django.utils import timezone

from .models import SeoIssueSeverity
from .scoring import health_band, score_object


def rescore(obj, *, save: bool = True) -> tuple[int, list[dict]]:
    """Recompute and (by default) persist an object's SEO score and issues."""
    score, issues = score_object(obj)
    obj.seo_score = score
    obj.seo_issues = issues
    obj.seo_checked_at = timezone.now()
    if save and obj.pk:
        obj.__class__.objects.filter(pk=obj.pk).update(
            seo_score=score, seo_issues=issues, seo_checked_at=obj.seo_checked_at
        )
    return score, issues


def critical_issues(issues: list[dict]) -> list[dict]:
    return [i for i in issues if i.get("severity") == SeoIssueSeverity.CRITICAL]


def find_duplicates(queryset, fields=("seo_title", "meta_description", "short_description")):
    """
    Group records that share an identical non-empty value on any of `fields`.

    Large-scale duplication across product pages is a real ranking problem, so
    this backs both the audit screen and the publish gate.
    """
    duplicates: dict[str, list[dict]] = {}
    for name in fields:
        buckets: dict[str, list] = defaultdict(list)
        for obj in queryset:
            value = (getattr(obj, name, "") or "").strip().lower()
            if value:
                buckets[value].append(obj)
        groups = [
            {
                "value": value[:120],
                "count": len(objs),
                "items": [{"id": o.pk, "slug": o.slug, "name": str(o)} for o in objs],
            }
            for value, objs in buckets.items()
            if len(objs) > 1
        ]
        if groups:
            duplicates[name] = groups
    return duplicates


def audit_queryset(queryset) -> dict:
    """
    Score every record in `queryset` and summarise it for the health dashboard.

    Returns real counts derived from real checks — nothing here is decorative.
    """
    bands = {"healthy": 0, "needs_attention": 0, "critical": 0}
    issue_counts: dict[str, int] = defaultdict(int)
    scored = []

    for obj in queryset:
        score, issues = rescore(obj, save=True)
        band = health_band(score, issues)
        bands[band] += 1
        for issue in issues:
            issue_counts[issue["code"]] += 1
        scored.append(
            {
                "id": obj.pk,
                "slug": obj.slug,
                "name": str(obj),
                "score": score,
                "band": band,
                "issue_count": len(issues),
            }
        )

    scored.sort(key=lambda r: r["score"])
    return {
        "total": len(scored),
        "bands": bands,
        "issues_by_code": dict(sorted(issue_counts.items(), key=lambda kv: -kv[1])),
        "worst": scored[:25],
        "checked_at": timezone.now().isoformat(),
    }


def validate_for_publish(obj) -> list[str]:
    """
    Hard gate for publication.

    Returns a list of human-readable blockers; empty means the record may be
    published. This is intentionally stricter than the score: an SEO-critical
    page must not go live incomplete.
    """
    blockers: list[str] = []

    if not (getattr(obj, "name", "") or getattr(obj, "title", "")):
        blockers.append("A name is required.")
    if not getattr(obj, "slug", ""):
        blockers.append("A URL slug is required.")

    if hasattr(obj, "category") and getattr(obj, "category_id", None) is None:
        blockers.append("A category must be assigned before publishing.")

    if not (getattr(obj, "short_description", "") or getattr(obj, "summary", "")):
        blockers.append("A short description is required.")

    if not (getattr(obj, "seo_title", "") or "").strip():
        blockers.append("An SEO title is required.")
    if not (getattr(obj, "meta_description", "") or "").strip():
        blockers.append("A meta description is required.")

    if not getattr(obj, "verified", False):
        blockers.append(
            "The record must be marked verified — only confirmed information is published."
        )

    score, issues = score_object(obj)
    for issue in critical_issues(issues):
        blockers.append(issue["message"])

    # De-duplicate while preserving order.
    seen: set[str] = set()
    return [b for b in blockers if not (b in seen or seen.add(b))]
