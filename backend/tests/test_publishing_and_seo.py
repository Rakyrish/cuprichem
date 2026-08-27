"""The publish gate, the SEO scoring engine and the unpublish strategy."""

from __future__ import annotations

import pytest

from apps.catalog.models import Product, ProductRedirect
from apps.catalog.services import PublishBlocked, publish_product, unpublish_product
from apps.seo.scoring import score_object
from apps.seo.services import validate_for_publish

pytestmark = pytest.mark.django_db


def test_incomplete_product_cannot_be_published(db, category):
    product = Product.objects.create(name="Bare Product", slug="bare-product", category=category)
    with pytest.raises(PublishBlocked) as exc:
        publish_product(product)

    blockers = " ".join(exc.value.blockers).lower()
    assert "seo title" in blockers
    assert "meta description" in blockers
    product.refresh_from_db()
    assert product.status != "published"


def test_unverified_product_cannot_be_published(publishable_product):
    publishable_product.verified = False
    publishable_product.save()
    blockers = validate_for_publish(publishable_product)
    assert any("verified" in b.lower() for b in blockers)


def test_complete_product_publishes(publishable_product, admin_user):
    publish_product(publishable_product, actor=admin_user)
    publishable_product.refresh_from_db()
    assert publishable_product.status == "published"
    assert publishable_product.published_at is not None
    assert publishable_product.is_public is True


def test_publish_via_api_returns_actionable_blockers(auth, product_manager, db, category):
    product = Product.objects.create(name="Half Done", slug="half-done", category=category)
    response = auth(product_manager).post(f"/api/admin/products/{product.pk}/publish/", format="json")
    assert response.status_code == 400
    assert response.data["error"]["code"] == "publish_blocked"
    assert len(response.data["error"]["details"]["blockers"]) > 0


def test_unpublish_records_an_explicit_url_strategy(publishable_product, admin_user):
    """§30 — a retired URL must never silently redirect to the homepage."""
    publish_product(publishable_product, actor=admin_user)
    unpublish_product(publishable_product, mode="410", reason="Discontinued", actor=admin_user)

    redirect = ProductRedirect.objects.get(from_path="/products/sodium-hypochlorite")
    assert redirect.mode == "410"
    assert redirect.to_path == ""


def test_301_requires_a_replacement_path(publishable_product):
    with pytest.raises(ValueError):
        unpublish_product(publishable_product, mode="301", to_path="")


def test_republishing_clears_the_tombstone(publishable_product, admin_user):
    publish_product(publishable_product, actor=admin_user)
    unpublish_product(publishable_product, mode="410", actor=admin_user)
    assert ProductRedirect.objects.filter(from_path=publishable_product.public_path).exists()

    publishable_product.status = "approved"
    publishable_product.save()
    publish_product(publishable_product, actor=admin_user)
    assert not ProductRedirect.objects.filter(from_path=publishable_product.public_path).exists()


# --------------------------------------------------------------------------- #
# Scoring engine
# --------------------------------------------------------------------------- #


def test_score_is_deterministic(publishable_product):
    first, _ = score_object(publishable_product)
    second, _ = score_object(publishable_product)
    assert first == second


def test_empty_product_scores_low_with_critical_issues(db, category):
    product = Product.objects.create(name="Empty", slug="empty", category=category)
    score, issues = score_object(product)
    assert score < 50
    assert any(i["severity"] == "critical" for i in issues)


def test_good_product_scores_higher_than_bad(publishable_product, db, category):
    bad = Product.objects.create(name="Bad", slug="bad", category=category)
    good_score, _ = score_object(publishable_product)
    bad_score, _ = score_object(bad)
    assert good_score > bad_score


def test_missing_category_is_flagged_as_critical(db):
    product = Product.objects.create(name="Orphan", slug="orphan")
    _, issues = score_object(product)
    codes = {i["code"] for i in issues}
    assert "no_category" in codes
    assert next(i for i in issues if i["code"] == "no_category")["severity"] == "critical"


def test_noindex_on_published_record_is_flagged(publishable_product, admin_user):
    publish_product(publishable_product, actor=admin_user)
    publishable_product.robots_index = False
    _, issues = score_object(publishable_product)
    assert "noindex_on_public" in {i["code"] for i in issues}


def test_over_long_title_is_flagged(publishable_product):
    publishable_product.seo_title = "A" * 120
    _, issues = score_object(publishable_product)
    assert "title_long" in {i["code"] for i in issues}


def test_missing_alt_text_is_flagged(publishable_product, image):
    image.alt_text = ""
    image.save()
    publishable_product.refresh_from_db()
    _, issues = score_object(publishable_product)
    assert "image_alt_missing" in {i["code"] for i in issues}


def test_recommendations_are_actionable_not_vague(db, category):
    """§23 — every message must say what to do, not just that something is bad."""
    product = Product.objects.create(name="Vague", slug="vague", category=category)
    _, issues = score_object(product)
    for issue in issues:
        message = issue["message"]
        assert len(message) > 40, f"message too terse to act on: {message}"
        assert message.lower() not in {"improve seo.", "content is weak."}


def test_duplicate_detection_finds_shared_meta(db, category):
    from apps.seo.services import find_duplicates

    shared = "The same meta description used on two different pages."
    for slug in ("dup-a", "dup-b"):
        Product.objects.create(
            name=slug, slug=slug, category=category, meta_description=shared
        )
    duplicates = find_duplicates(Product.objects.all())
    assert duplicates["meta_description"][0]["count"] == 2
