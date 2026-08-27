"""
Production settings.

Refuses to boot on an unsafe configuration rather than silently running with a
dev secret or an open host list — a misconfigured deploy should fail fast.
"""

from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F403
from .base import env, env_bool

DEBUG = False

_required = {
    "DJANGO_SECRET_KEY": SECRET_KEY,  # noqa: F405
    "POSTGRES_PASSWORD": DATABASES["default"]["PASSWORD"],  # noqa: F405
}
_missing = [name for name, value in _required.items() if not value]
if _missing:
    raise ImproperlyConfigured(
        f"Missing required production environment variables: {', '.join(_missing)}"
    )

if SECRET_KEY.startswith("insecure-dev-key"):  # noqa: F405
    raise ImproperlyConfigured("DJANGO_SECRET_KEY is still the development default.")

if not ALLOWED_HOSTS or ALLOWED_HOSTS == ["*"]:  # noqa: F405
    raise ImproperlyConfigured("DJANGO_ALLOWED_HOSTS must be set to real hostnames.")

# TLS / cookie hardening. Terminating TLS at a proxy is the expected setup.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", True)
SECURE_HSTS_SECONDS = 63072000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
JWT_COOKIE_SECURE = True
X_FRAME_OPTIONS = "DENY"

if env("SENTRY_DSN"):
    # Wire an error reporter here when one is provisioned. Deliberately not
    # guessed at — an unconfigured reporter is worse than none.
    pass
