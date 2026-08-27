"""
Uniform API error envelope.

Every failure — validation, permission, throttle, integrity, unexpected — comes
back in one shape so the admin frontend has a single error path:

    {"error": {"code": "validation_error", "message": "...", "details": {...}}}
"""

from __future__ import annotations

import logging

from django.db import IntegrityError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger("cuprichem.api")

_CODE_BY_STATUS = {
    400: "validation_error",
    401: "not_authenticated",
    403: "permission_denied",
    404: "not_found",
    405: "method_not_allowed",
    409: "conflict",
    413: "payload_too_large",
    415: "unsupported_media_type",
    429: "rate_limited",
    500: "server_error",
    503: "service_unavailable",
}


class ServiceUnavailable(Exception):
    """A required integration (OpenAI, Cloudinary) is not configured/reachable."""

    def __init__(self, message: str, *, code: str = "service_unavailable"):
        super().__init__(message)
        self.message = message
        self.code = code


def _envelope(code: str, message: str, details=None) -> dict:
    payload = {"error": {"code": code, "message": message}}
    if details is not None:
        payload["error"]["details"] = details
    return payload


def api_exception_handler(exc, context):
    if isinstance(exc, ServiceUnavailable):
        return Response(
            _envelope(exc.code, exc.message),
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    if isinstance(exc, IntegrityError):
        # Almost always a unique-constraint race (duplicate slug). Report it as a
        # conflict rather than leaking the database message to the client.
        logger.warning("Integrity error on %s", context.get("view"), exc_info=True)
        return Response(
            _envelope("conflict", "That record conflicts with an existing one."),
            status=status.HTTP_409_CONFLICT,
        )

    response = drf_exception_handler(exc, context)
    if response is None:
        logger.exception("Unhandled API exception in %s", context.get("view"))
        return Response(
            _envelope("server_error", "An unexpected error occurred."),
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    code = _CODE_BY_STATUS.get(response.status_code, "error")
    data = response.data

    if isinstance(data, dict) and "detail" in data and len(data) == 1:
        response.data = _envelope(code, str(data["detail"]))
    elif isinstance(data, dict):
        response.data = _envelope(code, "The request could not be processed.", data)
    else:
        response.data = _envelope(code, "The request could not be processed.", {"errors": data})

    return response
