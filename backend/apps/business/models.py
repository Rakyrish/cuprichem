"""Inbound business records — quote requests and general enquiries."""

from __future__ import annotations

from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class Inquiry(TimeStampedModel):
    class Kind(models.TextChoices):
        QUOTE = "quote", "Quote request"
        CONTACT = "contact", "General enquiry"

    class Status(models.TextChoices):
        NEW = "new", "New"
        IN_PROGRESS = "in_progress", "In progress"
        QUOTED = "quoted", "Quoted"
        CLOSED = "closed", "Closed"
        SPAM = "spam", "Spam"

    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.QUOTE)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.NEW, db_index=True
    )

    name = models.CharField(max_length=150)
    email = models.EmailField()
    phone = models.CharField(max_length=60, blank=True)
    company = models.CharField(max_length=200, blank=True)

    product_text = models.CharField(max_length=300, blank=True)
    product = models.ForeignKey(
        "catalog.Product", null=True, blank=True, on_delete=models.SET_NULL, related_name="inquiries"
    )
    quantity = models.CharField(max_length=150, blank=True)
    message = models.TextField(blank=True)

    assigned_to = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="inquiries"
    )
    internal_notes = models.TextField(blank=True)

    #: Captured for abuse triage only, never displayed publicly.
    source_ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=300, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "inquiries"
        indexes = [models.Index(fields=["status", "-created_at"])]

    def __str__(self) -> str:
        return f"{self.name} <{self.email}> ({self.kind})"


class CompanySettings(TimeStampedModel):
    """
    Verified company information used across the public site.

    NOTE: the KRA PIN and the director's name are deliberately NOT stored here.
    They are sensitive identity data, they are not needed to source a chemical,
    and they were explicitly removed from the public site. Do not add them
    without an equally explicit decision — and if they are ever added, they must
    be admin-only, permission-gated and audited.
    """

    legal_name = models.CharField(max_length=200)
    trading_name = models.CharField(max_length=200, blank=True)
    email = models.EmailField(blank=True)
    sales_email = models.EmailField(blank=True)
    phones = models.JSONField(default=list, blank=True)

    address_building = models.CharField(max_length=200, blank=True)
    address_street = models.CharField(max_length=200, blank=True)
    address_locality = models.CharField(max_length=120, blank=True)
    address_region = models.CharField(max_length=120, blank=True)
    address_country = models.CharField(max_length=120, blank=True)
    address_country_code = models.CharField(max_length=4, blank=True)
    postal_address = models.CharField(max_length=200, blank=True)

    default_seo_title_suffix = models.CharField(max_length=120, blank=True)
    default_meta_description = models.CharField(max_length=320, blank=True)

    class Meta:
        verbose_name_plural = "company settings"

    def __str__(self) -> str:
        return self.legal_name

    @classmethod
    def load(cls) -> "CompanySettings":
        """
        Singleton accessor — there is exactly one company.

        The row is seeded from the shared root `.env` (see COMPANY_* and
        SITE_LEGAL_NAME) rather than from literals, so a fresh database and the
        public site start out agreeing on the same facts. Once the row exists
        the admin is the source of truth and the environment is not re-applied.
        """
        obj = cls.objects.first()
        if obj is None:
            obj = cls.objects.create(**cls.defaults_from_env())
        return obj

    @staticmethod
    def defaults_from_env() -> dict[str, object]:
        """Company facts as declared in the repository-root `.env`."""
        company = settings.COMPANY
        return {
            "legal_name": company["legal_name"],
            "trading_name": company["trading_name"],
            "email": company["email"],
            "sales_email": company["sales_email"],
            "phones": company["phones"],
            "address_building": company["address"]["building"],
            "address_street": company["address"]["street"],
            "address_locality": company["address"]["locality"],
            "address_region": company["address"]["region"],
            "address_country": company["address"]["country"],
            "address_country_code": company["address"]["country_code"],
            "postal_address": company["address"]["postal"],
        }
