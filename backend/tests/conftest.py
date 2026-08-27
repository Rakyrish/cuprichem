from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.models import Role
from apps.catalog.models import Category, Product
from apps.mediahub.models import MediaAsset

User = get_user_model()
PASSWORD = "correct-horse-battery-staple"


@pytest.fixture(autouse=True)
def _isolate_throttles():
    """
    Throttle state is process-global: DRF caches counters in Django's cache and
    reads rates from a CLASS attribute. Without this, one test's throttling
    leaks into the next and produces confusing 429s far from the cause.
    """
    from django.core.cache import cache
    from rest_framework.throttling import ScopedRateThrottle

    original = ScopedRateThrottle.THROTTLE_RATES
    cache.clear()
    yield
    ScopedRateThrottle.THROTTLE_RATES = original
    cache.clear()


@pytest.fixture
def api():
    # enforce_csrf_checks stays off here; CSRF behaviour has its own test.
    return APIClient()


def _make_user(email: str, role: str) -> User:
    return User.objects.create_user(email=email, password=PASSWORD, role=role, is_active=True)


@pytest.fixture
def admin_user(db):
    return _make_user("admin@cuprichem.test", Role.ADMIN)


@pytest.fixture
def product_manager(db):
    return _make_user("pm@cuprichem.test", Role.PRODUCT_MANAGER)


@pytest.fixture
def content_manager(db):
    return _make_user("content@cuprichem.test", Role.CONTENT_MANAGER)


@pytest.fixture
def viewer(db):
    return _make_user("viewer@cuprichem.test", Role.VIEWER)


@pytest.fixture
def sales(db):
    return _make_user("sales@cuprichem.test", Role.SALES)


@pytest.fixture
def auth(api):
    """Sign a user in via the real login endpoint so cookies are exercised."""

    def _login(user):
        response = api.post(
            "/api/admin/auth/login/",
            {"email": user.email, "password": PASSWORD},
            format="json",
        )
        assert response.status_code == 200, response.data
        return api

    return _login


@pytest.fixture
def category(db):
    return Category.objects.create(
        slug="water-treatment-chemicals",
        name="Water Treatment Chemicals",
        summary="Coagulants, flocculants and disinfection chemistry for process water.",
        status="published",
        verified=True,
    )


@pytest.fixture
def image(db):
    return MediaAsset.objects.create(
        secure_url="https://res.cloudinary.com/demo/image/upload/v1/drum.jpg",
        alt_text="A blue 200 litre steel drum on a pallet",
        original_filename="drum.jpg",
        content_type="image/jpeg",
    )


@pytest.fixture
def publishable_product(db, category, image):
    """A product that satisfies every publish-gate requirement."""
    product = Product.objects.create(
        slug="sodium-hypochlorite",
        name="Sodium Hypochlorite",
        category=category,
        primary_image=image,
        short_description=(
            "A chlorine-based disinfectant supplied for water treatment and industrial "
            "sanitation across Kenya."
        ),
        description=(
            "Sodium hypochlorite is a chlorine-based oxidising agent widely used for "
            "the disinfection of potable and process water, for effluent treatment and "
            "for general industrial sanitation. It is supplied as a pale yellow "
            "solution and is dosed according to the free chlorine residual required by "
            "the process. Buyers should confirm the concentration, packaging and "
            "delivery arrangements appropriate to their site when requesting a quote, "
            "as handling requirements vary with strength and storage conditions."
        ),
        cas_number="7681-52-9",
        formula="NaClO",
        grade="Technical",
        purity="12-15%",
        packaging=["25 L jerrican", "200 L drum"],
        seo_title="Sodium Hypochlorite Supplier in Kenya | Cuprichem",
        meta_description=(
            "Industrial sodium hypochlorite supplied by Cuprichem for water treatment "
            "and sanitation across Kenya. Request a quote for grade and packaging."
        ),
        primary_keyword="sodium hypochlorite",
        status="draft",
        verified=True,
    )
    product.industries.clear()
    return product
