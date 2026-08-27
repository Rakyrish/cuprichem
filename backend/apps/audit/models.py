"""
Audit log.

Records who changed what, when, and from what to what. Entries are append-only:
there is no API to edit or delete them, which is the point — an audit trail that
can be rewritten is not an audit trail.
"""

from __future__ import annotations

from django.conf import settings
from django.db import models


class AuditAction(models.TextChoices):
    CREATE = "create", "Created"
    UPDATE = "update", "Updated"
    DELETE = "delete", "Deleted"
    PUBLISH = "publish", "Published"
    UNPUBLISH = "unpublish", "Unpublished"
    APPROVE = "approve", "Approved"
    REJECT = "reject", "Rejected"
    AI_GENERATE = "ai_generate", "AI content generated"
    AI_ACCEPT = "ai_accept", "AI content accepted"
    AI_REJECT = "ai_reject", "AI content rejected"
    SEO_UPDATE = "seo_update", "SEO metadata changed"
    LOGIN = "login", "Signed in"
    LOGIN_FAILED = "login_failed", "Sign-in failed"
    LOGOUT = "logout", "Signed out"
    SETTINGS_UPDATE = "settings_update", "Settings changed"


class AuditLog(models.Model):
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_entries",
    )
    #: Denormalised so the trail survives the user record being deleted.
    actor_email = models.CharField(max_length=254, blank=True)
    action = models.CharField(max_length=32, choices=AuditAction.choices, db_index=True)

    target_type = models.CharField(max_length=64, blank=True, db_index=True)
    target_id = models.CharField(max_length=64, blank=True, db_index=True)
    target_label = models.CharField(max_length=255, blank=True)

    #: {field: {"old": ..., "new": ...}} — only the fields that actually changed.
    changes = models.JSONField(default=dict, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["target_type", "target_id"]),
            models.Index(fields=["action", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.actor_email or 'system'} {self.action} {self.target_type}#{self.target_id}"
