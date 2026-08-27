"""
Health endpoints.

`/health/` is unauthenticated and deliberately minimal — it reveals liveness and
nothing else. `/ready/` reports dependency status but still never returns a
hostname, credential, version or connection string.
"""

from __future__ import annotations

from django.conf import settings
from django.db import connection
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


def _database_ok() -> bool:
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        return True
    except Exception:
        return False


def _redis_ok() -> bool:
    try:
        import redis  # imported lazily so the app boots without redis installed

        client = redis.Redis.from_url(settings.CELERY_BROKER_URL, socket_timeout=2)
        return bool(client.ping())
    except Exception:
        return False


@api_view(["GET"])
@permission_classes([AllowAny])
def health(_request):
    return Response({"status": "ok"})


@api_view(["GET"])
@permission_classes([AllowAny])
def ready(_request):
    checks = {
        "database": _database_ok(),
        "redis": _redis_ok(),
        # Integrations report CONFIGURED / NOT CONFIGURED only — never the value.
        "openai_configured": bool(settings.OPENAI_API_KEY),
        "cloudinary_configured": bool(
            settings.CLOUDINARY_CLOUD_NAME
            and settings.CLOUDINARY_API_KEY
            and settings.CLOUDINARY_API_SECRET
        ),
    }
    # Only hard dependencies gate readiness; an unconfigured integration is a
    # degraded feature, not a dead service.
    healthy = checks["database"]
    return Response(
        {"status": "ready" if healthy else "degraded", "checks": checks},
        status=status.HTTP_200_OK if healthy else status.HTTP_503_SERVICE_UNAVAILABLE,
    )
