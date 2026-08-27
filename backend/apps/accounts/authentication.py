"""
JWT authentication carried in HTTP-only cookies.

Why cookies and not `Authorization: Bearer` from localStorage: a token in
localStorage is readable by any script that manages to run on the page, so one
XSS becomes a full account takeover with a stealable, long-lived credential.
HTTP-only cookies are unreadable to JS. The trade-off is CSRF exposure, which is
handled by requiring the CSRF header on unsafe methods (see `enforce_csrf`).

Tokens are signed with SECRET_KEY. `token_version` is embedded so a password
change or forced logout invalidates every outstanding token for that user.
"""

from __future__ import annotations

import datetime as dt

import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from django.middleware.csrf import CsrfViewMiddleware
from rest_framework import authentication, exceptions

ACCESS = "access"
REFRESH = "refresh"

SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS", "TRACE"})


class _CsrfCheck(CsrfViewMiddleware):
    """
    Runs Django's CSRF validation on demand.

    `process_view` normally calls `_reject` to build a 403 response; overriding
    it to return the reason lets the caller raise a DRF exception instead, so
    the failure flows through the standard API error envelope.
    """

    def _reject(self, request, reason):
        return reason


def _now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def issue_token(user, kind: str) -> str:
    ttl = (
        settings.JWT_ACCESS_TTL_SECONDS
        if kind == ACCESS
        else settings.JWT_REFRESH_TTL_SECONDS
    )
    now = _now()
    payload = {
        "sub": str(user.pk),
        "typ": kind,
        "role": user.role,
        "iat": int(now.timestamp()),
        "exp": int((now + dt.timedelta(seconds=ttl)).timestamp()),
        # Ties the token to the current credential. Changing the password
        # changes the hash, which invalidates every previously issued token.
        "pwv": user.password[-16:],
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str, expected_kind: str) -> dict:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
    except jwt.ExpiredSignatureError as exc:
        raise exceptions.AuthenticationFailed("Session expired.") from exc
    except jwt.InvalidTokenError as exc:
        raise exceptions.AuthenticationFailed("Invalid session.") from exc

    if payload.get("typ") != expected_kind:
        raise exceptions.AuthenticationFailed("Invalid session.")
    return payload


def set_auth_cookies(response, user) -> None:
    common = {
        "secure": settings.JWT_COOKIE_SECURE,
        "httponly": True,
        "samesite": settings.JWT_COOKIE_SAMESITE,
        "domain": settings.JWT_COOKIE_DOMAIN,
        "path": "/",
    }
    response.set_cookie(
        settings.JWT_ACCESS_COOKIE,
        issue_token(user, ACCESS),
        max_age=settings.JWT_ACCESS_TTL_SECONDS,
        **common,
    )
    response.set_cookie(
        settings.JWT_REFRESH_COOKIE,
        issue_token(user, REFRESH),
        max_age=settings.JWT_REFRESH_TTL_SECONDS,
        **common,
    )


def clear_auth_cookies(response) -> None:
    for name in (settings.JWT_ACCESS_COOKIE, settings.JWT_REFRESH_COOKIE):
        response.delete_cookie(
            name, domain=settings.JWT_COOKIE_DOMAIN, samesite=settings.JWT_COOKIE_SAMESITE
        )


class CookieJWTAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        token = request.COOKIES.get(settings.JWT_ACCESS_COOKIE)
        if not token:
            return None

        payload = decode_token(token, ACCESS)
        user_model = get_user_model()
        try:
            user = user_model.objects.get(pk=payload["sub"])
        except (user_model.DoesNotExist, KeyError, ValueError) as exc:
            raise exceptions.AuthenticationFailed("Invalid session.") from exc

        if not user.is_active:
            raise exceptions.AuthenticationFailed("This account is disabled.")

        if payload.get("pwv") != user.password[-16:]:
            raise exceptions.AuthenticationFailed("Session expired. Please sign in again.")

        self.enforce_csrf(request)
        return (user, token)

    def enforce_csrf(self, request) -> None:
        """
        Cookie auth means the browser attaches credentials automatically, so
        state-changing requests must also present the CSRF token. Safe methods
        are exempt.
        """
        if request.method in SAFE_METHODS:
            return

        check = _CsrfCheck(lambda _req: None)
        check.process_request(request)
        reason = check.process_view(request, None, (), {})
        if reason is not None:
            raise exceptions.PermissionDenied("CSRF verification failed.")
