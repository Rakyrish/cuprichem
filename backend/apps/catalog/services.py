"""
Catalogue business logic.

Two rules are enforced here and nowhere else, so they cannot be bypassed by a
different code path:

  1. A record becomes publicly visible ONLY through `publish_product`, which
     runs the publish gate first.
  2. AI output NEVER overwrites a value an administrator has verified —
     `apply_ai_payload` records a conflict instead.
"""

from __future__ import annotations

import logging

from django.db import transaction
from django.utils import timezone

from apps.audit.services import AuditAction, diff_fields, record
from apps.core.models import ContentOrigin, PublishStatus
from apps.seo.services import rescore, validate_for_publish

from .models import Product, ProductRedirect

logger = logging.getLogger("cuprichem.catalog")


class PublishBlocked(Exception):
    """Raised when a record fails the publish gate."""

    def __init__(self, blockers: list[str]):
        super().__init__("Publish blocked")
        self.blockers = blockers


#: Technical fields an administrator can mark verified. AI may propose values
#: for these, but may never overwrite a verified one.
TECHNICAL_FIELDS = (
    "cas_number",
    "formula",
    "molecular_weight",
    "grade",
    "purity",
    "appearance",
    "packaging",
    "manufacturer",
)

CONTENT_FIELDS = (
    "short_description",
    "description",
    "procurement_notes",
    "faqs",
)

SEO_FIELDS = (
    "seo_title",
    "meta_description",
    "primary_keyword",
    "secondary_keywords",
)


def apply_ai_payload(
    product: Product,
    payload: dict,
    *,
    fields: list[str] | None = None,
    confidence: dict | None = None,
    actor=None,
) -> dict:
    """
    Apply accepted AI values to a product.

    Returns ``{"applied": {...}, "conflicts": [...], "skipped": [...]}``.

    A field listed in `product.verified_fields` is never written. Instead the
    proposed value comes back as a conflict for the administrator to resolve —
    the admin's value stands until they say otherwise (§60/§61).
    """
    allowed = set(fields) if fields else set(TECHNICAL_FIELDS + CONTENT_FIELDS + SEO_FIELDS)
    verified = set(product.verified_fields or [])

    before = {f: getattr(product, f, None) for f in allowed}
    applied: dict[str, object] = {}
    conflicts: list[dict] = []
    skipped: list[str] = []

    for name, value in payload.items():
        if name not in allowed or not hasattr(product, name):
            continue
        if value in (None, "", [], {}):
            skipped.append(name)
            continue

        current = getattr(product, name)
        if name in verified and current not in (None, "", [], {}) and current != value:
            conflicts.append(
                {
                    "field": name,
                    "admin_value": current,
                    "ai_value": value,
                    "resolution": "admin_value_retained",
                }
            )
            continue

        setattr(product, name, value)
        applied[name] = value

    if confidence:
        merged = dict(product.field_confidence or {})
        # A verified field is HIGH by definition; never downgrade it.
        merged.update({k: v for k, v in confidence.items() if k not in verified})
        product.field_confidence = merged

    if applied:
        product.content_origin = (
            ContentOrigin.AI_GENERATED
            if product.content_origin == ContentOrigin.HUMAN and not product.pk
            else ContentOrigin.AI_ASSISTED
        )
        if product.status == PublishStatus.DRAFT:
            product.status = PublishStatus.NEEDS_REVIEW

    product.save()
    rescore(product)

    after = {f: getattr(product, f, None) for f in allowed}
    record(
        AuditAction.AI_ACCEPT,
        target=product,
        changes=diff_fields(before, after),
        metadata={"conflicts": conflicts, "skipped": skipped},
        actor=actor,
    )
    return {"applied": applied, "conflicts": conflicts, "skipped": skipped}


@transaction.atomic
def publish_product(product: Product, *, actor=None) -> Product:
    """
    The ONLY path to public visibility.

    Runs the publish gate first; an incomplete SEO-critical page cannot go live.
    """
    blockers = validate_for_publish(product)
    if blockers:
        raise PublishBlocked(blockers)

    previous_status = product.status
    product.status = PublishStatus.PUBLISHED
    if product.published_at is None:
        product.published_at = timezone.now()
    if actor is not None:
        product.approved_by = actor
        product.approved_at = product.approved_at or timezone.now()
    if product.content_origin in (ContentOrigin.AI_GENERATED, ContentOrigin.AI_ASSISTED):
        product.content_origin = ContentOrigin.HUMAN_APPROVED
    product.save()
    rescore(product)

    # A previously retired URL is live again — drop any stale tombstone.
    ProductRedirect.objects.filter(from_path=product.public_path).delete()

    record(
        AuditAction.PUBLISH,
        target=product,
        changes={"status": {"old": previous_status, "new": product.status}},
        actor=actor,
    )
    _revalidate(product.public_path)
    return product


@transaction.atomic
def unpublish_product(
    product: Product,
    *,
    mode: str = ProductRedirect.Mode.GONE,
    to_path: str = "",
    reason: str = "",
    actor=None,
) -> Product:
    """
    Retire a public URL deliberately.

    Every unpublish writes a ProductRedirect row stating what the URL should now
    do. Blanket-redirecting retired products to the homepage is exactly the
    behaviour this prevents (§30) — a 301 requires an explicit replacement path.
    """
    if mode == ProductRedirect.Mode.REDIRECT and not to_path:
        raise ValueError("A 301 redirect requires a replacement path.")

    previous_status = product.status
    product.status = PublishStatus.UNPUBLISHED
    product.save(update_fields=["status", "updated_at"])

    ProductRedirect.objects.update_or_create(
        from_path=product.public_path,
        defaults={"mode": mode, "to_path": to_path, "reason": reason},
    )

    record(
        AuditAction.UNPUBLISH,
        target=product,
        changes={"status": {"old": previous_status, "new": product.status}},
        metadata={"mode": mode, "to_path": to_path, "reason": reason},
        actor=actor,
    )
    _revalidate(product.public_path)
    return product


def approve_product(product: Product, *, actor=None) -> Product:
    product.status = PublishStatus.APPROVED
    product.approved_by = actor
    product.approved_at = timezone.now()
    product.content_origin = ContentOrigin.HUMAN_APPROVED
    product.save()
    record(AuditAction.APPROVE, target=product, actor=actor)
    return product


def _revalidate(path: str) -> None:
    """
    Ask the public Next.js site to regenerate a path.

    Best-effort by design: a revalidation failure must never roll back a publish
    that already succeeded in the database. Failures are logged for follow-up.
    """
    from django.conf import settings

    if not settings.REVALIDATE_SECRET or not settings.PUBLIC_SITE_URL:
        return
    try:
        import urllib.error
        import urllib.request

        request = urllib.request.Request(
            f"{settings.PUBLIC_SITE_URL}/api/revalidate",
            data=f'{{"path": "{path}"}}'.encode(),
            headers={
                "Content-Type": "application/json",
                "X-Revalidate-Secret": settings.REVALIDATE_SECRET,
            },
            method="POST",
        )
        urllib.request.urlopen(request, timeout=5).close()
    except Exception:
        logger.warning("Revalidation failed for %s", path, exc_info=True)
