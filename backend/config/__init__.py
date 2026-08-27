"""
Importing the Celery app here means `shared_task` is always registered against
the configured broker, whichever entry point boots Django.
"""

from .celery import app as celery_app

__all__ = ("celery_app",)
