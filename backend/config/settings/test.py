"""
Test settings.

Tests run against PostgreSQL — the same engine as production — so constraint,
JSON and transaction behaviour is exercised for real. Celery runs inline so
queued work executes synchronously, and the OpenAI key is deliberately blank so
any accidental real API call fails loudly instead of costing money.

Requires a reachable Postgres server; Django creates and drops `test_<NAME>`.
"""

from .base import *  # noqa: F403
from .base import env

DEBUG = False
ALLOWED_HOSTS = ["*"]
# Not read from the environment on purpose: tests must never run against a real
# signing key, and must never depend on one being present.
SECRET_KEY = "test-only-key-not-used-anywhere-else"

# Same connection settings as every other environment (from the shared .env);
# only the test-runner specifics are overridden here.
DATABASES = {
    "default": {
        **DATABASES["default"],  # noqa: F405
        # A pooled connection would be reused across the test database
        # teardown, so it is disabled here.
        "CONN_MAX_AGE": 0,
        "TEST": {"NAME": env("POSTGRES_TEST_DB", "test_cuprichem")},
    }
}

# Fast, deterministic password hashing for fixtures.
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

CELERY_TASK_ALWAYS_EAGER = True
JWT_COOKIE_SECURE = False

# No real credentials in tests. OpenAI is always mocked.
OPENAI_API_KEY = ""
CLOUDINARY_CLOUD_NAME = ""
CLOUDINARY_API_KEY = ""
CLOUDINARY_API_SECRET = ""

# Scoped throttles raise ImproperlyConfigured if a declared scope has no rate,
# so the scopes are kept and simply set high enough not to interfere with
# functional tests. The throttling test overrides these with real limits.
_UNTHROTTLED = "1000/min"
REST_FRAMEWORK = {  # noqa: F405
    **REST_FRAMEWORK,  # noqa: F405
    "DEFAULT_THROTTLE_RATES": {
        scope: _UNTHROTTLED
        for scope in REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]  # noqa: F405
    },
}

LOGGING["root"]["level"] = "ERROR"  # noqa: F405
