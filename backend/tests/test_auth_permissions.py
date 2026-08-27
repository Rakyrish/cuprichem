"""Authentication and authorisation — including the escalation cases."""

from __future__ import annotations

import pytest
from django.conf import settings

from apps.accounts.models import Capability, Role
from apps.audit.models import AuditAction, AuditLog

pytestmark = pytest.mark.django_db


def test_login_sets_httponly_cookies_and_never_returns_a_token(api, admin_user):
    response = api.post(
        "/api/admin/auth/login/",
        {"email": admin_user.email, "password": "correct-horse-battery-staple"},
        format="json",
    )
    assert response.status_code == 200

    access = response.cookies[settings.JWT_ACCESS_COOKIE]
    assert access["httponly"] is True, "access token must be unreadable by JavaScript"
    assert response.cookies[settings.JWT_REFRESH_COOKIE]["httponly"] is True

    body = str(response.data)
    assert access.value not in body, "the raw token must never appear in the response body"


def test_login_failure_is_generic_and_audited(api, admin_user):
    response = api.post(
        "/api/admin/auth/login/",
        {"email": admin_user.email, "password": "wrong-password-entirely"},
        format="json",
    )
    assert response.status_code == 401
    assert response.data["error"]["message"] == "Incorrect email or password."
    assert AuditLog.objects.filter(action=AuditAction.LOGIN_FAILED).exists()


def test_unknown_email_gives_the_same_message_as_a_wrong_password(api, admin_user):
    """Otherwise the endpoint becomes an account-enumeration oracle."""
    unknown = api.post(
        "/api/admin/auth/login/",
        {"email": "nobody@cuprichem.test", "password": "whatever-password"},
        format="json",
    )
    wrong = api.post(
        "/api/admin/auth/login/",
        {"email": admin_user.email, "password": "wrong-password-entirely"},
        format="json",
    )
    assert unknown.data["error"] == wrong.data["error"]


def test_anonymous_cannot_reach_the_catalogue(api):
    assert api.get("/api/admin/products/").status_code in (401, 403)


def test_viewer_can_read_but_not_write(auth, viewer, category):
    client = auth(viewer)
    assert client.get("/api/admin/products/").status_code == 200
    response = client.post(
        "/api/admin/products/", {"name": "Test Product", "category": category.pk}, format="json"
    )
    assert response.status_code == 403


def test_sales_cannot_read_the_audit_log(auth, sales):
    assert auth(sales).get("/api/admin/audit-log/").status_code == 403


def test_content_manager_cannot_publish(auth, content_manager, publishable_product):
    """Publishing is a distinct capability, not implied by editing."""
    response = auth(content_manager).post(
        f"/api/admin/products/{publishable_product.pk}/publish/", format="json"
    )
    assert response.status_code == 403
    publishable_product.refresh_from_db()
    assert publishable_product.status == "draft"


def test_non_superuser_cannot_create_a_super_admin(auth, admin_user):
    """Guards privilege escalation via the user-management endpoint."""
    admin_user.role = Role.SUPER_ADMIN  # has user.manage but is not is_superuser
    admin_user.save()
    response = auth(admin_user).post(
        "/api/admin/users/",
        {
            "email": "new@cuprichem.test",
            "role": Role.SUPER_ADMIN,
            "password": "another-long-password",
        },
        format="json",
    )
    assert response.status_code == 400
    assert "super admin" in str(response.data).lower()


def test_changing_password_invalidates_existing_tokens(api, auth, admin_user):
    client = auth(admin_user)
    assert client.get("/api/admin/auth/me/").status_code == 200

    stale_access = client.cookies[settings.JWT_ACCESS_COOKIE].value
    response = client.post(
        "/api/admin/auth/change-password/",
        {
            "current_password": "correct-horse-battery-staple",
            "new_password": "a-completely-different-password",
        },
        format="json",
    )
    assert response.status_code == 200

    # Replay the pre-change token: it must no longer authenticate.
    from rest_framework.test import APIClient

    replay = APIClient()
    replay.cookies[settings.JWT_ACCESS_COOKIE] = stale_access
    assert replay.get("/api/admin/auth/me/").status_code in (401, 403)


def test_capability_map_covers_every_role():
    from apps.accounts.models import ROLE_CAPABILITIES

    assert set(ROLE_CAPABILITIES) == {r.value for r in Role}
    valid = {c.value for c in Capability}
    for role, caps in ROLE_CAPABILITIES.items():
        assert caps <= valid, f"{role} references an unknown capability"


def test_view_without_capability_map_is_denied():
    """`HasCapability` must fail closed on a misconfigured view."""
    from apps.accounts.permissions import HasCapability

    class Req:
        method = "GET"

    class User:
        is_authenticated = True
        is_active = True

        def has_capability(self, _c):
            return True

    class View:
        pass  # no required_capabilities declared

    request = Req()
    request.user = User()
    assert HasCapability().has_permission(request, View()) is False
