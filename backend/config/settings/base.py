"""
Shared Django settings for the Cuprichem control centre.

Environment-specific modules (dev/prod/test) import from here and override only
what differs.

Every value below is read from the SINGLE repository-root `.env` — the same
file the public Next.js site and the admin console read (see `.env.example`).
The backend has no `.env` of its own; adding one would reintroduce exactly the
drift between the three apps that the shared file exists to prevent. Nothing
secret is ever hardcoded, and production refuses to boot without the values it
needs (see prod.py).
"""

from __future__ import annotations

import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

# backend/config/settings/base.py -> backend/
BASE_DIR = Path(__file__).resolve().parent.parent.parent
# backend/ -> repository root, where the one and only .env lives.
REPO_ROOT = BASE_DIR.parent

load_dotenv(REPO_ROOT / ".env")


def env(key: str, default: str | None = None) -> str | None:
    return os.environ.get(key, default)


def env_bool(key: str, default: bool = False) -> bool:
    raw = os.environ.get(key)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def env_int(key: str, default: int) -> int:
    raw = os.environ.get(key)
    if raw is None or not raw.strip():
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def env_list(key: str, default: str = "") -> list[str]:
    raw = os.environ.get(key, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


def env_required(key: str) -> str:
    """For values that have no sane default and must not be silently blank."""
    value = os.environ.get(key, "").strip()
    if not value:
        raise ImproperlyConfigured(
            f"Missing required environment variable {key}. "
            f"Copy .env.example to .env at {REPO_ROOT} and fill it in."
        )
    return value


# --------------------------------------------------------------------------- #
# Core
# --------------------------------------------------------------------------- #

SECRET_KEY = env("DJANGO_SECRET_KEY", "insecure-dev-key-override-in-production")
DEBUG = env_bool("DJANGO_DEBUG", False)
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third party
    "rest_framework",
    "corsheaders",
    "django_filters",
    # Local
    "apps.core",
    "apps.accounts",
    "apps.audit",
    "apps.catalog",
    "apps.content",
    "apps.mediahub",
    "apps.seo",
    "apps.ai",
    "apps.business",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    # Binds the acting user to the current thread so model-level audit hooks can
    # attribute a change without threading `request` through every call site.
    "apps.audit.middleware.AuditActorMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# --------------------------------------------------------------------------- #
# Database — Postgres everywhere except the local test runner.
# --------------------------------------------------------------------------- #

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env_required("POSTGRES_DB"),
        "USER": env_required("POSTGRES_USER"),
        "PASSWORD": env("POSTGRES_PASSWORD", ""),
        "HOST": env("POSTGRES_HOST", "127.0.0.1"),
        "PORT": env("POSTGRES_PORT", "5432"),
        "CONN_MAX_AGE": env_int("POSTGRES_CONN_MAX_AGE", 60),
    }
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 12},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = env_required("DJANGO_LANGUAGE_CODE")
TIME_ZONE = env_required("DJANGO_TIME_ZONE")
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "mediafiles"

# --------------------------------------------------------------------------- #
# DRF
# --------------------------------------------------------------------------- #

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "apps.accounts.authentication.CookieJWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    # Deny by default. Every endpoint opts in explicitly; a view that forgets to
    # declare permissions is locked, not open.
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.DefaultPagination",
    "PAGE_SIZE": env_int("API_PAGE_SIZE", 25),
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "EXCEPTION_HANDLER": "apps.core.exceptions.api_exception_handler",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        # AI endpoints are expensive; these are deliberately conservative.
        "ai_generate": env("THROTTLE_AI_GENERATE", "20/hour"),
        "ai_analyze": env("THROTTLE_AI_ANALYZE", "30/hour"),
        "seo_audit": env("THROTTLE_SEO_AUDIT", "60/hour"),
        "login": env("THROTTLE_LOGIN", "10/min"),
    },
}

# --------------------------------------------------------------------------- #
# Auth tokens — JWT delivered in HTTP-only cookies (never localStorage).
# --------------------------------------------------------------------------- #

JWT_ALGORITHM = env("JWT_ALGORITHM", "HS256")
JWT_ACCESS_TTL_SECONDS = env_int("JWT_ACCESS_TTL_SECONDS", 15 * 60)
JWT_REFRESH_TTL_SECONDS = env_int("JWT_REFRESH_TTL_SECONDS", 7 * 24 * 60 * 60)
JWT_ACCESS_COOKIE = env_required("JWT_ACCESS_COOKIE")
JWT_REFRESH_COOKIE = env_required("JWT_REFRESH_COOKIE")
JWT_COOKIE_SECURE = env_bool("JWT_COOKIE_SECURE", True)
JWT_COOKIE_SAMESITE = env("JWT_COOKIE_SAMESITE", "Lax")
JWT_COOKIE_DOMAIN = env("JWT_COOKIE_DOMAIN") or None

# --------------------------------------------------------------------------- #
# CORS / CSRF — the admin SPA is a separate origin.
# --------------------------------------------------------------------------- #

# The admin console is the only browser client of this API, so its origin (one
# value in the shared .env) is the whole allow-list. CORS_ALLOWED_ORIGINS /
# CSRF_TRUSTED_ORIGINS remain overridable for deployments that front the admin
# with additional hostnames.
ADMIN_ORIGIN = env_required("ADMIN_ORIGIN").rstrip("/")
CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS") or [ADMIN_ORIGIN]
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS") or [ADMIN_ORIGIN]
CSRF_COOKIE_HTTPONLY = False  # the admin SPA must read it to echo the header
SESSION_COOKIE_HTTPONLY = True

# --------------------------------------------------------------------------- #
# Integrations
# --------------------------------------------------------------------------- #

# OpenAI. The key lives ONLY here, server-side. It is never serialised into an
# API response and never reaches the browser.
OPENAI_API_KEY = env("OPENAI_API_KEY", "")
OPENAI_MODEL = env("OPENAI_MODEL", "gpt-5")
OPENAI_VISION_MODEL = env("OPENAI_VISION_MODEL", "") or env("OPENAI_MODEL", "gpt-5")
OPENAI_TIMEOUT = env_int("OPENAI_TIMEOUT", 90)
OPENAI_MAX_RETRIES = env_int("OPENAI_MAX_RETRIES", 2)
OPENAI_MAX_OUTPUT_TOKENS = env_int("OPENAI_MAX_OUTPUT_TOKENS", 4000)

CLOUDINARY_CLOUD_NAME = env("CLOUDINARY_CLOUD_NAME", "")
CLOUDINARY_API_KEY = env("CLOUDINARY_API_KEY", "")
CLOUDINARY_API_SECRET = env("CLOUDINARY_API_SECRET", "")
CLOUDINARY_FOLDER = env("CLOUDINARY_FOLDER", "cuprichem")

# Public site — used for revalidation hooks and SEO audits. Same SITE_URL the
# Next.js site builds its canonical URLs from.
PUBLIC_SITE_URL = env_required("SITE_URL").rstrip("/")

REVALIDATE_SECRET = env("REVALIDATE_SECRET", "")

# --------------------------------------------------------------------------- #
# Site and company facts
#
# Read from the SAME variables the Next.js site reads, so the public pages, the
# admin console and the seeded database can never disagree about who the
# company is. These seed `business.CompanySettings` on an empty database; after
# that the admin is the source of truth.
#
# The KRA PIN and the director's name are deliberately absent — see
# apps/business/models.py.
# --------------------------------------------------------------------------- #

SITE_NAME = env_required("SITE_NAME")
SITE_LEGAL_NAME = env_required("SITE_LEGAL_NAME")


def _phone_displays(raw: str) -> list[str]:
    """COMPANY_PHONES is `display|E.164` pairs; the DB stores display forms."""
    entries = [item.strip() for item in raw.split(",") if item.strip()]
    return [entry.split("|", 1)[0].strip() for entry in entries]


COMPANY = {
    "legal_name": SITE_LEGAL_NAME,
    "trading_name": SITE_NAME,
    "email": env("COMPANY_EMAIL", ""),
    "sales_email": env("COMPANY_SALES_EMAIL", ""),
    "phones": _phone_displays(env("COMPANY_PHONES", "") or ""),
    "address": {
        "building": env("COMPANY_ADDRESS_BUILDING", ""),
        "street": env("COMPANY_ADDRESS_STREET", ""),
        "locality": env("COMPANY_ADDRESS_LOCALITY", ""),
        "region": env("COMPANY_ADDRESS_REGION", ""),
        "country": env("COMPANY_ADDRESS_COUNTRY", ""),
        "country_code": env("COMPANY_ADDRESS_COUNTRY_CODE", ""),
        "postal": env("COMPANY_POSTAL_ADDRESS", ""),
    },
}

# Celery
CELERY_BROKER_URL = env("CELERY_BROKER_URL", "redis://127.0.0.1:6379/0")
CELERY_RESULT_BACKEND = env("CELERY_RESULT_BACKEND", "redis://127.0.0.1:6379/1")
CELERY_TASK_ALWAYS_EAGER = env_bool("CELERY_TASK_ALWAYS_EAGER", False)
CELERY_TASK_TIME_LIMIT = env_int("CELERY_TASK_TIME_LIMIT", 600)

# Upload guards (also enforced per-serializer).
MAX_UPLOAD_BYTES = env_int("MAX_UPLOAD_BYTES", 10 * 1024 * 1024)
DATA_UPLOAD_MAX_MEMORY_SIZE = MAX_UPLOAD_BYTES
ALLOWED_IMAGE_TYPES = env_list(
    "ALLOWED_IMAGE_TYPES", "image/jpeg,image/png,image/webp,image/avif"
)

# --------------------------------------------------------------------------- #
# Logging — never log credentials or token values.
# --------------------------------------------------------------------------- #

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "standard": {"format": "%(asctime)s %(levelname)s %(name)s %(message)s"},
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "standard"},
    },
    "root": {"handlers": ["console"], "level": env("LOG_LEVEL", "INFO")},
    "loggers": {
        "django.db.backends": {"level": "WARNING", "handlers": ["console"], "propagate": False},
        "cuprichem": {"level": env("LOG_LEVEL", "INFO"), "handlers": ["console"], "propagate": False},
    },
}
