"""
AI integration.

OpenAI is mocked everywhere in this file — the suite makes no network calls and
costs nothing. What is tested is our behaviour around the model: schema
validation, hallucination guards, failure handling, and the rule that AI output
cannot reach the public site without a human.
"""

from __future__ import annotations

from unittest.mock import patch

import pytest

from apps.ai.models import AIJob, AIJobStatus, ReviewState
from apps.ai.services.openai_client import AIError, AIResult
from apps.ai.services.validators import (
    validate_cas_number,
    validate_image_analysis,
    validate_product_content,
    validate_seo,
)
from apps.catalog.services import apply_ai_payload

pytestmark = pytest.mark.django_db


# --------------------------------------------------------------------------- #
# CAS check-digit validation — a real, cheap hallucination detector.
# --------------------------------------------------------------------------- #


@pytest.mark.parametrize(
    "cas",
    ["7681-52-9", "64-19-7", "7647-01-0", "1310-73-2", "7664-93-9"],
)
def test_real_cas_numbers_pass(cas):
    ok, message = validate_cas_number(cas)
    assert ok, message


@pytest.mark.parametrize("cas", ["7681-52-1", "64-19-9", "1234-56-7"])
def test_invalid_check_digit_is_rejected(cas):
    ok, message = validate_cas_number(cas)
    assert not ok
    assert "check-digit" in message


@pytest.mark.parametrize("cas", ["not-a-cas", "12-3", "7681_52_9", "abc-de-f"])
def test_malformed_cas_is_rejected(cas):
    assert validate_cas_number(cas)[0] is False


def test_blank_cas_is_allowed():
    """Absent is fine; wrong is not."""
    assert validate_cas_number("")[0] is True


def test_bad_cas_from_image_is_downgraded_not_dropped(db):
    data, warnings = validate_image_analysis(
        {
            "cas_number": "7681-52-1",  # wrong check digit
            "confidence": {"cas_number": "high"},
            "warnings": [],
            "unknown_fields": [],
        }
    )
    assert data["confidence"]["cas_number"] == "low"
    assert data["cas_number"] == "7681-52-1", "keep it for the reviewer to correct"
    assert any("check-digit" in w for w in warnings)


def test_contradictory_unknown_field_is_flagged():
    data, warnings = validate_image_analysis(
        {
            "purity": "98%",
            "unknown_fields": ["purity"],
            "confidence": {"purity": "high"},
            "warnings": [],
        }
    )
    assert data["confidence"]["purity"] == "unknown"
    assert any("unknown" in w.lower() for w in warnings)


def test_prohibited_claims_are_flagged():
    _, warnings = validate_product_content(
        {
            "short_description": "Always in stock at the best price.",
            "description": "We are ISO 9001 certified by an accredited body.",
            "warnings": [],
        }
    )
    joined = " ".join(warnings).lower()
    assert "stock" in joined
    assert "certification" in joined


def test_invented_internal_links_are_discarded():
    """§86 — the model may only link to pages that exist."""
    data, warnings = validate_seo(
        {
            "seo_title": "Fine",
            "meta_description": "Fine",
            "suggested_slug": "fine",
            "internal_link_suggestions": [
                {"path": "/categories/real", "anchor_text": "Real", "reason": "r"},
                {"path": "/categories/invented", "anchor_text": "Fake", "reason": "r"},
            ],
            "warnings": [],
        },
        allowed_paths={"/categories/real"},
    )
    paths = [link["path"] for link in data["internal_link_suggestions"]]
    assert paths == ["/categories/real"]
    assert any("do not exist" in w for w in warnings)


def test_invalid_slug_suggestion_is_discarded():
    data, _ = validate_seo(
        {"suggested_slug": "Not A Valid Slug!", "seo_title": "", "meta_description": "", "warnings": []}
    )
    assert data["suggested_slug"] == ""


# --------------------------------------------------------------------------- #
# Endpoint behaviour
# --------------------------------------------------------------------------- #


def _fake_result(data: dict) -> AIResult:
    return AIResult(data=data, model="test-model", prompt_tokens=10, completion_tokens=20, total_tokens=30)


def test_ai_endpoint_reports_when_not_configured(auth, product_manager, publishable_product):
    """§76 — never simulate success when there is no API key."""
    response = auth(product_manager).post(
        "/api/admin/ai/generate-product/", {"product": publishable_product.pk}, format="json"
    )
    assert response.status_code == 503
    assert response.data["error"]["code"] == "ai_not_configured"


def test_generation_creates_a_job_but_does_not_touch_the_product(
    auth, product_manager, publishable_product, settings
):
    settings.OPENAI_API_KEY = "test-key"
    original_description = publishable_product.description

    payload = {
        "short_description": "AI generated summary.",
        "description": "AI generated body copy for the product page.",
        "applications": ["Water disinfection"],
        "industries": [],
        "packaging_description": "",
        "procurement_notes": "",
        "faqs": [],
        "needs_verification": [],
        "warnings": [],
    }
    with patch(
        "apps.ai.services.product_generator.structured_completion",
        return_value=_fake_result(payload),
    ):
        response = auth(product_manager).post(
            "/api/admin/ai/generate-product/", {"product": publishable_product.pk}, format="json"
        )

    assert response.status_code == 201
    job = AIJob.objects.get(pk=response.data["id"])
    assert job.status == AIJobStatus.COMPLETED
    assert job.review_state == ReviewState.PENDING
    assert job.total_tokens == 30

    publishable_product.refresh_from_db()
    assert publishable_product.description == original_description, (
        "AI output must not be applied until a human accepts it"
    )


def test_accept_applies_only_the_selected_fields(
    auth, product_manager, publishable_product, settings
):
    settings.OPENAI_API_KEY = "test-key"
    job = AIJob.objects.create(
        operation="product_generate",
        status=AIJobStatus.COMPLETED,
        product=publishable_product,
        result={
            "short_description": "Accepted summary.",
            "description": "Rejected body.",
        },
    )
    response = auth(product_manager).post(
        f"/api/admin/ai/jobs/{job.pk}/accept/", {"fields": ["short_description"]}, format="json"
    )
    assert response.status_code == 200

    publishable_product.refresh_from_db()
    assert publishable_product.short_description == "Accepted summary."
    assert publishable_product.description != "Rejected body."


def test_ai_failure_preserves_the_product_and_records_the_error(
    auth, product_manager, publishable_product, settings
):
    """§37 — an AI outage must never cost the administrator their work."""
    settings.OPENAI_API_KEY = "test-key"
    before = publishable_product.description

    with patch(
        "apps.ai.services.product_generator.structured_completion",
        side_effect=AIError("upstream exploded", code="ai_unavailable"),
    ):
        response = auth(product_manager).post(
            "/api/admin/ai/generate-product/", {"product": publishable_product.pk}, format="json"
        )

    assert response.status_code >= 400
    publishable_product.refresh_from_db()
    assert publishable_product.description == before

    job = AIJob.objects.latest("created_at")
    assert job.status == AIJobStatus.FAILED
    assert job.error_code == "ai_unavailable"


def test_malformed_model_output_is_rejected(settings):
    """A non-JSON response must raise, never reach the database."""
    from apps.ai.services import openai_client

    settings.OPENAI_API_KEY = "test-key"

    class _Msg:
        content = "this is not json"
        refusal = None

    class _Choice:
        message = _Msg()
        finish_reason = "stop"

    class _Response:
        choices = [_Choice()]
        usage = None

    class _Client:
        class chat:  # noqa: N801
            class completions:  # noqa: N801
                @staticmethod
                def create(**_kwargs):
                    return _Response()

    with patch.object(openai_client, "_client", return_value=_Client()):
        with pytest.raises(AIError) as exc:
            openai_client.structured_completion(
                system_prompt="s", user_content="u", json_schema={"name": "x", "schema": {}}
            )
    assert exc.value.code == "ai_invalid_json"


def test_truncated_response_is_rejected(settings):
    from apps.ai.services import openai_client

    settings.OPENAI_API_KEY = "test-key"

    class _Msg:
        content = '{"a": 1'
        refusal = None

    class _Choice:
        message = _Msg()
        finish_reason = "length"

    class _Response:
        choices = [_Choice()]
        usage = None

    class _Client:
        class chat:  # noqa: N801
            class completions:  # noqa: N801
                @staticmethod
                def create(**_kwargs):
                    return _Response()

    with patch.object(openai_client, "_client", return_value=_Client()):
        with pytest.raises(AIError) as exc:
            openai_client.structured_completion(
                system_prompt="s", user_content="u", json_schema={"name": "x", "schema": {}}
            )
    assert exc.value.code == "ai_truncated"


# --------------------------------------------------------------------------- #
# Human override (§60/§61)
# --------------------------------------------------------------------------- #


def test_ai_cannot_overwrite_an_admin_verified_field(publishable_product, admin_user):
    publishable_product.purity = "99%"
    publishable_product.verified_fields = ["purity"]
    publishable_product.save()

    outcome = apply_ai_payload(publishable_product, {"purity": "98%"}, actor=admin_user)

    publishable_product.refresh_from_db()
    assert publishable_product.purity == "99%", "the administrator's value must stand"
    assert outcome["conflicts"][0] == {
        "field": "purity",
        "admin_value": "99%",
        "ai_value": "98%",
        "resolution": "admin_value_retained",
    }
    assert "purity" not in outcome["applied"]


def test_ai_may_fill_an_unverified_empty_field(publishable_product, admin_user):
    publishable_product.appearance = ""
    publishable_product.save()
    outcome = apply_ai_payload(publishable_product, {"appearance": "Pale yellow liquid"}, actor=admin_user)
    publishable_product.refresh_from_db()
    assert publishable_product.appearance == "Pale yellow liquid"
    assert outcome["conflicts"] == []


def test_verified_field_confidence_is_never_downgraded(publishable_product, admin_user):
    publishable_product.verified_fields = ["cas_number"]
    publishable_product.save()
    apply_ai_payload(
        publishable_product, {"grade": "Technical"}, confidence={"cas_number": "low"}, actor=admin_user
    )
    publishable_product.refresh_from_db()
    assert publishable_product.confidence_for("cas_number") == "high"
