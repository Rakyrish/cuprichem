"""Celery application. Long-running AI and SEO work runs here, not in requests."""

import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

app = Celery("cuprichem")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
