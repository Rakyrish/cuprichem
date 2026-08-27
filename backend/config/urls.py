"""
API routing.

Everything the admin SPA uses lives under /api/admin/. Health endpoints sit
outside that prefix because load balancers must reach them unauthenticated.
"""

from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.accounts import views as account_views
from apps.ai.views import AIJobViewSet, AIViewSet
from apps.audit.views import AuditLogViewSet
from apps.business.views import CompanySettingsViewSet, InquiryViewSet
from apps.catalog.views import (
    ApplicationViewSet,
    CategoryViewSet,
    IndustryViewSet,
    ProductViewSet,
)
from apps.core.health import health, ready
from apps.mediahub.views import MediaAssetViewSet
from apps.seo.views import DashboardViewSet, SeoViewSet

router = DefaultRouter()
router.register("products", ProductViewSet, basename="product")
router.register("categories", CategoryViewSet, basename="category")
router.register("industries", IndustryViewSet, basename="industry")
router.register("applications", ApplicationViewSet, basename="application")
router.register("media", MediaAssetViewSet, basename="media")
router.register("inquiries", InquiryViewSet, basename="inquiry")
router.register("users", account_views.UserViewSet, basename="user")
router.register("audit-log", AuditLogViewSet, basename="audit-log")
router.register("ai", AIViewSet, basename="ai")
router.register("ai/jobs", AIJobViewSet, basename="ai-job")
router.register("seo", SeoViewSet, basename="seo")
router.register("dashboard", DashboardViewSet, basename="dashboard")
router.register("settings/company", CompanySettingsViewSet, basename="company-settings")

auth_patterns = [
    path("csrf/", account_views.csrf, name="csrf"),
    path("login/", account_views.login, name="login"),
    path("logout/", account_views.logout, name="logout"),
    path("refresh/", account_views.refresh, name="refresh"),
    path("me/", account_views.me, name="me"),
    path("change-password/", account_views.change_password, name="change-password"),
]

urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("health/", health, name="health"),
    path("ready/", ready, name="ready"),
    path("api/admin/auth/", include((auth_patterns, "auth"))),
    path("api/admin/", include(router.urls)),
]
