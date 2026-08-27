"""Audit recording helpers."""

from __future__ import annotations

import logging
from typing import Any

from django.db import models

from .middleware import get_actor, get_actor_ip
from .models import AuditAction, AuditLog

logger = logging.getLogger("cuprichem.audit")

#: Never copy these into an audit entry, even if they change.
_REDACTED_FIELDS = {"password", "token", "api_key", "secret", "openai_api_key"}


def _serialise(value: Any) -> Any:
    """Coerce a field value into something JSON can hold."""
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, models.Model):
        return str(value.pk)
    if isinstance(value, (list, tuple)):
        return [_serialise(v) for v in value]
    if isinstance(value, dict):
        return {k: _serialise(v) for k, v in value.items()}
    return str(value)


def diff_fields(before: dict, after: dict) -> dict:
    """Return {field: {"old", "new"}} for changed, non-redacted fields."""
    changes: dict[str, dict] = {}
    for key in set(before) | set(after):
        if key in _REDACTED_FIELDS:
            continue
        old, new = before.get(key), after.get(key)
        if old != new:
            changes[key] = {"old": _serialise(old), "new": _serialise(new)}
    return changes


def record(
    action: str,
    *,
    target: models.Model | None = None,
    target_type: str = "",
    target_id: str = "",
    target_label: str = "",
    changes: dict | None = None,
    metadata: dict | None = None,
    actor=None,
    ip: str | None = None,
) -> AuditLog | None:
    """
    Write one audit entry.

    Auditing must never break the operation it is recording, so any failure here
    is logged and swallowed rather than raised.
    """
    try:
        if target is not None:
            target_type = target_type or target.__class__.__name__
            target_id = target_id or str(target.pk)
            target_label = target_label or str(target)[:255]

        actor = actor or get_actor()
        return AuditLog.objects.create(
            actor=actor if getattr(actor, "pk", None) else None,
            actor_email=getattr(actor, "email", "") or "",
            action=action,
            target_type=target_type,
            target_id=target_id,
            target_label=target_label,
            changes=changes or {},
            metadata=metadata or {},
            ip_address=ip or get_actor_ip(),
        )
    except Exception:
        logger.exception("Failed to write audit entry for action=%s", action)
        return None


__all__ = ["AuditAction", "record", "diff_fields"]
