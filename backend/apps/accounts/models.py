"""
Users and roles.

Authorisation is capability-based: a role maps to a fixed set of capability
strings, and every protected endpoint declares the capability it needs. Hiding
a button in the frontend is a courtesy — `HasCapability` in permissions.py is
what actually enforces access.
"""

from __future__ import annotations

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models

from apps.core.models import TimeStampedModel


class Capability(models.TextChoices):
    """Every distinct thing a user can be permitted to do."""

    PRODUCT_VIEW = "product.view", "View products"
    PRODUCT_EDIT = "product.edit", "Create and edit products"
    PRODUCT_DELETE = "product.delete", "Delete products"
    PRODUCT_PUBLISH = "product.publish", "Publish and unpublish products"

    TAXONOMY_EDIT = "taxonomy.edit", "Manage categories, industries, applications"
    ARTICLE_EDIT = "article.edit", "Manage articles and resources"
    ARTICLE_PUBLISH = "article.publish", "Publish articles"

    SEO_VIEW = "seo.view", "View SEO data"
    SEO_EDIT = "seo.edit", "Edit SEO metadata"
    SEO_AUDIT = "seo.audit", "Run SEO audits"

    AI_GENERATE = "ai.generate", "Run AI generation and analysis"

    MEDIA_VIEW = "media.view", "View media library"
    MEDIA_EDIT = "media.edit", "Upload and manage media"

    INQUIRY_VIEW = "inquiry.view", "View inquiries"
    INQUIRY_EDIT = "inquiry.edit", "Manage inquiries"

    AUDIT_VIEW = "audit.view", "View audit log"
    USER_MANAGE = "user.manage", "Manage users and roles"
    SETTINGS_MANAGE = "settings.manage", "Manage system settings"


class Role(models.TextChoices):
    SUPER_ADMIN = "super_admin", "Super admin"
    ADMIN = "admin", "Admin"
    CONTENT_MANAGER = "content_manager", "Content manager"
    SEO_MANAGER = "seo_manager", "SEO manager"
    PRODUCT_MANAGER = "product_manager", "Product manager"
    SALES = "sales", "Sales"
    VIEWER = "viewer", "Viewer"


_C = Capability

#: Role → capabilities. Deliberately explicit: adding a capability to a role is
#: a reviewable change, not an emergent side effect of some inheritance chain.
ROLE_CAPABILITIES: dict[str, set[str]] = {
    Role.SUPER_ADMIN: {c.value for c in Capability},
    Role.ADMIN: {c.value for c in Capability} - {_C.USER_MANAGE.value},
    Role.CONTENT_MANAGER: {
        _C.PRODUCT_VIEW.value,
        _C.PRODUCT_EDIT.value,
        _C.TAXONOMY_EDIT.value,
        _C.ARTICLE_EDIT.value,
        _C.ARTICLE_PUBLISH.value,
        _C.SEO_VIEW.value,
        _C.SEO_EDIT.value,
        _C.AI_GENERATE.value,
        _C.MEDIA_VIEW.value,
        _C.MEDIA_EDIT.value,
    },
    Role.SEO_MANAGER: {
        _C.PRODUCT_VIEW.value,
        _C.SEO_VIEW.value,
        _C.SEO_EDIT.value,
        _C.SEO_AUDIT.value,
        _C.AI_GENERATE.value,
        _C.MEDIA_VIEW.value,
    },
    Role.PRODUCT_MANAGER: {
        _C.PRODUCT_VIEW.value,
        _C.PRODUCT_EDIT.value,
        _C.PRODUCT_PUBLISH.value,
        _C.TAXONOMY_EDIT.value,
        _C.SEO_VIEW.value,
        _C.SEO_EDIT.value,
        _C.AI_GENERATE.value,
        _C.MEDIA_VIEW.value,
        _C.MEDIA_EDIT.value,
    },
    Role.SALES: {
        _C.PRODUCT_VIEW.value,
        _C.INQUIRY_VIEW.value,
        _C.INQUIRY_EDIT.value,
    },
    Role.VIEWER: {
        _C.PRODUCT_VIEW.value,
        _C.SEO_VIEW.value,
        _C.MEDIA_VIEW.value,
        _C.INQUIRY_VIEW.value,
    },
}


class UserManager(BaseUserManager):
    """Email-first manager — the admin signs in with an email address."""

    use_in_migrations = True

    def _create(self, email: str, password: str | None, **extra):
        if not email:
            raise ValueError("An email address is required.")
        email = self.normalize_email(email).lower()
        extra.setdefault("username", email)
        user = self.model(email=email, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email: str, password: str | None = None, **extra):
        extra.setdefault("is_staff", False)
        extra.setdefault("is_superuser", False)
        extra.setdefault("role", Role.VIEWER)
        return self._create(email, password, **extra)

    def create_superuser(self, email: str, password: str | None = None, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        extra.setdefault("role", Role.SUPER_ADMIN)
        if extra["is_staff"] is not True or extra["is_superuser"] is not True:
            raise ValueError("A superuser must have is_staff and is_superuser set.")
        return self._create(email, password, **extra)


class User(AbstractUser, TimeStampedModel):
    email = models.EmailField(unique=True, db_index=True)
    role = models.CharField(max_length=32, choices=Role.choices, default=Role.VIEWER)
    full_name = models.CharField(max_length=150, blank=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    objects = UserManager()

    class Meta:
        ordering = ["email"]

    def __str__(self) -> str:
        return self.email

    @property
    def capabilities(self) -> set[str]:
        """
        Effective capabilities. A Django superuser gets everything so an
        emergency `createsuperuser` account is never locked out of its own admin.
        """
        if self.is_superuser:
            return {c.value for c in Capability}
        return set(ROLE_CAPABILITIES.get(self.role, set()))

    def has_capability(self, capability: str) -> bool:
        return capability in self.capabilities
