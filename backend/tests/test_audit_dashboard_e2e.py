"""Audit trail, dashboard aggregates, throttling, and the full §93 workflow."""

from __future__ import annotations

from unittest.mock import patch

import pytest

from apps.ai.models import AIJob, AIJobStatus
from apps.ai.services.openai_client import AIResult
from apps.audit.models import AuditAction, AuditLog
from apps.catalog.models import Product

pytestmark = pytest.mark.django_db


# --------------------------------------------------------------------------- #
# Audit trail
# --------------------------------------------------------------------------- #


def test_create_and_update_are_audited_with_a_real_diff(auth, product_manager, category):
    client = auth(product_manager)
    created = client.post(
        "/api/admin/products/",
        {"name": "Citric Acid", "category": category.pk, "short_description": "An organic acid."},
        format="json",
    )
    assert created.status_code == 201
    product_id = created.data["id"]

    assert AuditLog.objects.filter(
        action=AuditAction.CREATE, target_type="Product", target_id=str(product_id)
    ).exists()

    client.patch(
        f"/api/admin/products/{product_id}/", {"grade": "Food grade"}, format="json"
    )
    entry = AuditLog.objects.filter(
        action=AuditAction.UPDATE, target_id=str(product_id)
    ).latest("created_at")
    assert entry.changes["grade"] == {"old": "", "new": "Food grade"}
    assert entry.actor_email == product_manager.email


def test_seo_change_is_recorded_as_an_seo_action(auth, product_manager, publishable_product):
    auth(product_manager).patch(
        f"/api/admin/products/{publishable_product.pk}/",
        {"seo_title": "A brand new SEO title for this page"},
        format="json",
    )
    assert AuditLog.objects.filter(
        action=AuditAction.SEO_UPDATE, target_id=str(publishable_product.pk)
    ).exists()


def test_publish_is_audited(auth, product_manager, publishable_product):
    auth(product_manager).post(f"/api/admin/products/{publishable_product.pk}/publish/", format="json")
    entry = AuditLog.objects.get(action=AuditAction.PUBLISH, target_id=str(publishable_product.pk))
    assert entry.changes["status"]["new"] == "published"


def test_audit_log_is_read_only_over_the_api(auth, admin_user):
    client = auth(admin_user)
    assert client.post("/api/admin/audit-log/", {}, format="json").status_code == 405
    entry = AuditLog.objects.create(action=AuditAction.LOGIN, actor_email="x@y.z")
    assert client.delete(f"/api/admin/audit-log/{entry.pk}/").status_code == 405


def test_audit_never_stores_passwords():
    from apps.audit.services import diff_fields

    changes = diff_fields({"password": "old-secret"}, {"password": "new-secret"})
    assert changes == {}


# --------------------------------------------------------------------------- #
# Dashboard — every number must come from the database (§75)
# --------------------------------------------------------------------------- #


def test_dashboard_is_all_zeroes_on_an_empty_database(auth, admin_user):
    response = auth(admin_user).get("/api/admin/dashboard/overview/")
    assert response.status_code == 200
    assert response.data["catalog"]["total"] == 0
    assert response.data["ai"]["total"] == 0
    assert response.data["business"]["total"] == 0


def test_dashboard_counts_track_real_records(auth, product_manager, publishable_product, category):
    client = auth(product_manager)
    before = client.get("/api/admin/dashboard/overview/").data["catalog"]["total"]

    Product.objects.create(name="Second", slug="second", category=category)
    after = client.get("/api/admin/dashboard/overview/").data["catalog"]

    assert after["total"] == before + 1
    assert after["published"] == 0

    client.post(f"/api/admin/products/{publishable_product.pk}/publish/", format="json")
    published = client.get("/api/admin/dashboard/overview/").data["catalog"]["published"]
    assert published == 1


def test_seo_health_bands_reflect_real_scores(auth, product_manager, publishable_product, category):
    Product.objects.create(name="Terrible", slug="terrible", category=category)
    client = auth(product_manager)
    client.post("/api/admin/seo/audit/", format="json")

    bands = client.get("/api/admin/dashboard/seo-health/").data["bands"]
    assert bands["critical"] >= 1, "an empty product must land in critical"
    assert sum(bands.values()) == Product.objects.count()


# --------------------------------------------------------------------------- #
# Rate limiting (§38)
# --------------------------------------------------------------------------- #


def test_ai_endpoint_is_rate_limited(auth, product_manager, publishable_product, settings):
    settings.OPENAI_API_KEY = "test-key"
    settings.REST_FRAMEWORK = {
        **settings.REST_FRAMEWORK,
        "DEFAULT_THROTTLE_RATES": {**settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"], "ai_generate": "2/min"},
    }

    from rest_framework.throttling import ScopedRateThrottle

    ScopedRateThrottle.THROTTLE_RATES = settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]

    payload = {
        "short_description": "x", "description": "y", "applications": [], "industries": [],
        "packaging_description": "", "procurement_notes": "", "faqs": [],
        "needs_verification": [], "warnings": [],
    }
    client = auth(product_manager)
    codes = []
    with patch(
        "apps.ai.services.product_generator.structured_completion",
        return_value=AIResult(data=payload, model="m"),
    ):
        for _ in range(4):
            codes.append(
                client.post(
                    "/api/admin/ai/generate-product/",
                    {"product": publishable_product.pk},
                    format="json",
                ).status_code
            )

    assert 429 in codes, f"expected a throttled response, got {codes}"


# --------------------------------------------------------------------------- #
# End-to-end (§93)
# --------------------------------------------------------------------------- #


def test_full_ai_product_workflow(auth, product_manager, category, image, settings):
    """
    Login → create → analyse image → generate content → generate SEO →
    accept → publish → verify public state, sitemap eligibility and audit trail.
    """
    settings.OPENAI_API_KEY = "test-key"
    client = auth(product_manager)

    # 1. Create the product record.
    created = client.post(
        "/api/admin/products/",
        {"name": "Citric Acid", "category": category.pk, "primary_image": image.pk},
        format="json",
    )
    assert created.status_code == 201
    product_id = created.data["id"]
    assert created.data["slug"] == "citric-acid"

    # 2. Analyse the product image.
    analysis = {
        "product_name": "Citric Acid", "chemical_name": "Citric acid", "manufacturer": "",
        "cas_number": "77-92-9", "formula": "C6H8O7", "grade": "Food grade", "purity": "99.5%",
        "packaging": ["25 kg bag"], "label_text": "CITRIC ACID ANHYDROUS",
        "confidence": {
            "product_name": "high", "chemical_name": "high", "manufacturer": "unknown",
            "cas_number": "high", "formula": "high", "grade": "medium", "purity": "low",
            "packaging": "high",
        },
        "unknown_fields": ["manufacturer"], "warnings": [],
    }
    with patch(
        "apps.ai.services.image_analyzer.structured_completion",
        return_value=AIResult(data=analysis, model="vision"),
    ):
        analyzed = client.post(
            "/api/admin/ai/analyze-image/",
            {"image_url": image.secure_url, "product": product_id},
            format="json",
        )
    assert analyzed.status_code == 201
    analyze_job = analyzed.data["id"]

    # 3. Accept the extracted technical identity.
    accepted = client.post(
        f"/api/admin/ai/jobs/{analyze_job}/accept/",
        {"fields": ["cas_number", "formula", "grade", "purity", "packaging"]},
        format="json",
    )
    assert accepted.status_code == 200
    product = Product.objects.get(pk=product_id)
    assert product.cas_number == "77-92-9"
    # Low-confidence OCR must be preserved as low, not silently promoted.
    assert product.confidence_for("purity") == "low"

    # 4. Generate content.
    content = {
        "short_description": "Food-grade citric acid supplied for industrial and food applications.",
        "description": (
            "Citric acid is a weak organic acid used as an acidulant, chelating agent "
            "and descaling agent across food processing, cleaning and water treatment. "
            "It is supplied in anhydrous crystalline form and dissolves readily in water. "
            "Buyers should confirm the grade and packaging required for their process "
            "when requesting a quote, as specifications vary between food and technical "
            "applications and handling requirements differ accordingly."
        ),
        "applications": ["Descaling", "Food acidulant"], "industries": [],
        "packaging_description": "25 kg bag", "procurement_notes": "Specify grade and quantity.",
        "faqs": [], "needs_verification": [], "warnings": [],
    }
    with patch(
        "apps.ai.services.product_generator.structured_completion",
        return_value=AIResult(data=content, model="m"),
    ):
        gen = client.post("/api/admin/ai/generate-product/", {"product": product_id}, format="json")
    client.post(
        f"/api/admin/ai/jobs/{gen.data['id']}/accept/",
        {"fields": ["short_description", "description", "procurement_notes"]},
        format="json",
    )

    # 5. Generate SEO metadata.
    seo = {
        "seo_title": "Citric Acid Supplier in Kenya | Cuprichem",
        "meta_description": (
            "Food and technical grade citric acid supplied by Cuprichem across Kenya. "
            "Request a quote for grade, purity and packaging options today."
        ),
        "suggested_h1": "Citric Acid", "suggested_slug": "citric-acid",
        "primary_keyword": "citric acid", "secondary_keywords": ["citric acid kenya"],
        "related_search_terms": [], "search_intent": "commercial",
        "internal_link_suggestions": [], "warnings": [],
    }
    with patch(
        "apps.ai.services.seo_generator.structured_completion",
        return_value=AIResult(data=seo, model="m"),
    ):
        seo_job = client.post("/api/admin/ai/generate-seo/", {"product": product_id}, format="json")
    client.post(
        f"/api/admin/ai/jobs/{seo_job.data['id']}/accept/",
        {"fields": ["seo_title", "meta_description", "primary_keyword"]},
        format="json",
    )

    # 6. Publishing is still blocked while the record is unverified.
    blocked = client.post(f"/api/admin/products/{product_id}/publish/", format="json")
    assert blocked.status_code == 400
    assert any("verified" in b.lower() for b in blocked.data["error"]["details"]["blockers"])

    # 7. A human confirms the record, then publishes.
    client.patch(
        f"/api/admin/products/{product_id}/",
        {"verified": True, "verified_fields": ["cas_number", "formula"]},
        format="json",
    )
    check = client.get(f"/api/admin/products/{product_id}/publish-check/")
    assert check.data["can_publish"] is True, check.data["blockers"]

    published = client.post(f"/api/admin/products/{product_id}/publish/", format="json")
    assert published.status_code == 200

    # 8. Verify final state.
    product.refresh_from_db()
    assert product.is_public is True
    assert product.public_path == "/products/citric-acid"
    assert product.content_origin == "human_approved"
    assert product in Product.objects.indexable()
    assert product.seo_score >= 80, product.seo_issues

    # 9. Every stage is on the audit trail.
    actions = set(
        AuditLog.objects.filter(target_id=str(product_id)).values_list("action", flat=True)
    )
    assert {AuditAction.CREATE, AuditAction.AI_ACCEPT, AuditAction.PUBLISH} <= actions

    # 10. AI jobs are recorded with usage, and none auto-applied.
    assert AIJob.objects.filter(product=product, status=AIJobStatus.COMPLETED).count() == 3

    # 11. The dashboard reflects the new product — from the database, not a constant.
    overview = client.get("/api/admin/dashboard/overview/").data
    assert overview["catalog"]["published"] == 1
    assert overview["ai"]["completed"] == 3
