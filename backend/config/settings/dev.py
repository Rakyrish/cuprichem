"""
Local development settings.

PostgreSQL is the database in every environment, including local development
and tests. The catalogue relies on Postgres-specific behaviour (JSONB
containment, real constraint semantics, case handling in unique slugs), so
developing against a different engine would let bugs through that only appear
in production.
"""

from .base import *  # noqa: F403

DEBUG = True
ALLOWED_HOSTS = ["*"]

# Cookies must be readable over plain HTTP locally.
JWT_COOKIE_SECURE = False
