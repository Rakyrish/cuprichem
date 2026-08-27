"""
Dashboard and SEO endpoints.

Every figure returned here is a live aggregate over the database. There are no
constants, no seeded demo numbers and no placeholder percentages anywhere in
this module — if a widget has nothing to show, it returns a real zero.
"""

from __future__ import annotations

from django.db.models import Count, Q
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.viewsets import GenericViewSet

from apps.accounts.models import Capability
from apps.accounts.permissions import HasCapability
from apps.ai.models import AIJob, AIJobStatus, ReviewState
from apps.business.models import Inquiry
from apps.catalog.models import Category, Industry, Product
from apps.content.models import Article
from apps.core.models import PublishStatus

from .scoring import health_band
from .services import audit_queryset, find_duplicates


class DashboardViewSet(GenericViewSet):
    permission_classes = [HasCapability]
    required_capabilities = {"*": Capability.PRODUCT_VIEW}
    queryset = Product.objects.none()

    @action(detail=False, methods=["get"], url_path="overview")
    def overview(self, request):
        product_counts = Product.objects.aggregate(
            total=Count("id"),
            published=Count("id", filter=Q(status=PublishStatus.PUBLISHED)),
            draft=Count("id", filter=Q(status=PublishStatus.DRAFT)),
            needs_review=Count("id", filter=Q(status=PublishStatus.NEEDS_REVIEW)),
            ai_generated=Count("id", filter=Q(status=PublishStatus.AI_GENERATED)),
            approved=Count("id", filter=Q(status=PublishStatus.APPROVED)),
            unpublished=Count("id", filter=Q(status=PublishStatus.UNPUBLISHED)),
            verified=Count("id", filter=Q(verified=True)),
        )

        seo_counts = Product.objects.aggregate(
            missing_title=Count("id", filter=Q(seo_title="")),
            missing_description=Count("id", filter=Q(meta_description="")),
            missing_image=Count("id", filter=Q(primary_image__isnull=True)),
            missing_category=Count("id", filter=Q(category__isnull=True)),
            weak_score=Count("id", filter=Q(seo_score__lt=50)),
            indexable=Count(
                "id",
                filter=Q(status=PublishStatus.PUBLISHED, verified=True, robots_index=True),
            ),
        )

        ai_counts = AIJob.objects.aggregate(
            total=Count("id"),
            completed=Count("id", filter=Q(status=AIJobStatus.COMPLETED)),
            failed=Count("id", filter=Q(status=AIJobStatus.FAILED)),
            pending_review=Count(
                "id",
                filter=Q(status=AIJobStatus.COMPLETED, review_state=ReviewState.PENDING),
            ),
        )
        token_total = sum(
            AIJob.objects.filter(status=AIJobStatus.COMPLETED).values_list(
                "total_tokens", flat=True
            )
        )

        business_counts = Inquiry.objects.aggregate(
            total=Count("id"),
            new=Count("id", filter=Q(status=Inquiry.Status.NEW)),
            in_progress=Count("id", filter=Q(status=Inquiry.Status.IN_PROGRESS)),
        )

        return Response(
            {
                "catalog": {
                    **product_counts,
                    "categories": Category.objects.count(),
                    "industries": Industry.objects.count(),
                    "articles": Article.objects.count(),
                },
                "seo": seo_counts,
                "ai": {**ai_counts, "total_tokens": token_total},
                "business": business_counts,
            }
        )

    @action(detail=False, methods=["get"], url_path="seo-health")
    def seo_health(self, request):
        """
        Band every product using its stored score.

        Uses persisted scores rather than rescoring, so the dashboard stays fast
        on a large catalogue; `POST /seo/audit/` is what refreshes them.
        """
        bands = {"healthy": 0, "needs_attention": 0, "critical": 0}
        rows = Product.objects.values("id", "slug", "name", "seo_score", "seo_issues")
        worst = []
        for row in rows:
            band = health_band(row["seo_score"], row["seo_issues"] or [])
            bands[band] += 1
            if band != "healthy":
                worst.append({**row, "band": band})

        worst.sort(key=lambda r: r["seo_score"])
        return Response(
            {"total": len(rows), "bands": bands, "worst": worst[:50]}
        )


class SeoViewSet(GenericViewSet):
    permission_classes = [HasCapability]
    required_capabilities = {
        "GET": Capability.SEO_VIEW,
        "*": Capability.SEO_AUDIT,
    }
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "seo_audit"
    queryset = Product.objects.none()

    @action(detail=False, methods=["post"], url_path="audit")
    def audit(self, request):
        """Re-run every deterministic check across the catalogue."""
        return Response(
            {
                "products": audit_queryset(
                    Product.objects.select_related("category", "primary_image").prefetch_related(
                        "industries"
                    )
                ),
                "categories": audit_queryset(Category.objects.select_related("image")),
            }
        )

    @action(detail=False, methods=["get"], url_path="duplicates")
    def duplicates(self, request):
        return Response(
            {
                "products": find_duplicates(
                    Product.objects.only(
                        "id", "slug", "name", "seo_title", "meta_description", "short_description"
                    )
                ),
            }
        )
