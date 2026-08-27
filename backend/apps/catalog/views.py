from __future__ import annotations

from django.db.models import Count
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.models import Capability
from apps.accounts.permissions import HasCapability
from apps.audit.services import AuditAction, diff_fields, record
from apps.seo.services import rescore, validate_for_publish

from .filters import ProductFilter
from .models import Application, Category, Industry, Product
from .serializers import (
    ApplicationSerializer,
    CategorySerializer,
    IndustrySerializer,
    ProductListSerializer,
    ProductSerializer,
    PublishSerializer,
)
from .services import PublishBlocked, approve_product, publish_product, unpublish_product


class AuditedModelViewSet(viewsets.ModelViewSet):
    """Writes an audit entry for every create/update/delete, with a real diff."""

    audit_fields: tuple[str, ...] = ()

    def _snapshot(self, instance) -> dict:
        return {f: getattr(instance, f, None) for f in self.audit_fields}

    def perform_create(self, serializer):
        instance = serializer.save()
        record(AuditAction.CREATE, target=instance, actor=self.request.user)
        rescore(instance)

    def perform_update(self, serializer):
        before = self._snapshot(serializer.instance)
        instance = serializer.save()
        changes = diff_fields(before, self._snapshot(instance))
        seo_touched = any(k.startswith(("seo_", "meta_", "canonical", "robots")) for k in changes)
        record(
            AuditAction.SEO_UPDATE if seo_touched else AuditAction.UPDATE,
            target=instance,
            changes=changes,
            actor=self.request.user,
        )
        rescore(instance)

    def perform_destroy(self, instance):
        record(AuditAction.DELETE, target=instance, actor=self.request.user)
        instance.delete()


class CategoryViewSet(AuditedModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [HasCapability]
    required_capabilities = {
        "GET": Capability.PRODUCT_VIEW,
        "HEAD": Capability.PRODUCT_VIEW,
        "OPTIONS": Capability.PRODUCT_VIEW,
        "*": Capability.TAXONOMY_EDIT,
    }
    filterset_fields = ["status", "verified"]
    search_fields = ["name", "summary", "slug"]
    ordering_fields = ["name", "display_order", "updated_at", "seo_score"]
    audit_fields = ("name", "slug", "summary", "status", "verified", "seo_title", "meta_description")

    def get_queryset(self):
        return Category.objects.annotate(product_count=Count("products"))


class IndustryViewSet(AuditedModelViewSet):
    queryset = Industry.objects.all()
    serializer_class = IndustrySerializer
    permission_classes = [HasCapability]
    required_capabilities = {
        "GET": Capability.PRODUCT_VIEW,
        "HEAD": Capability.PRODUCT_VIEW,
        "OPTIONS": Capability.PRODUCT_VIEW,
        "*": Capability.TAXONOMY_EDIT,
    }
    filterset_fields = ["status", "verified"]
    search_fields = ["name", "summary", "slug"]
    ordering_fields = ["name", "display_order", "updated_at"]
    audit_fields = ("name", "slug", "summary", "status", "verified")


class ApplicationViewSet(AuditedModelViewSet):
    queryset = Application.objects.all()
    serializer_class = ApplicationSerializer
    permission_classes = [HasCapability]
    required_capabilities = {
        "GET": Capability.PRODUCT_VIEW,
        "HEAD": Capability.PRODUCT_VIEW,
        "OPTIONS": Capability.PRODUCT_VIEW,
        "*": Capability.TAXONOMY_EDIT,
    }
    search_fields = ["name"]
    audit_fields = ("name", "slug")


class ProductViewSet(AuditedModelViewSet):
    permission_classes = [HasCapability]
    required_capabilities = {
        "GET": Capability.PRODUCT_VIEW,
        "HEAD": Capability.PRODUCT_VIEW,
        "OPTIONS": Capability.PRODUCT_VIEW,
        "POST": Capability.PRODUCT_EDIT,
        "PUT": Capability.PRODUCT_EDIT,
        "PATCH": Capability.PRODUCT_EDIT,
        "DELETE": Capability.PRODUCT_DELETE,
    }
    filterset_class = ProductFilter
    search_fields = ["name", "slug", "cas_number", "short_description"]
    ordering_fields = ["name", "updated_at", "created_at", "seo_score", "published_at"]
    audit_fields = (
        "name", "slug", "status", "verified", "category_id", "short_description",
        "description", "cas_number", "grade", "purity", "seo_title", "meta_description",
    )

    def get_queryset(self):
        # select_related/prefetch_related keep the product table at a constant
        # query count regardless of page size.
        return (
            Product.objects.select_related("category", "primary_image")
            .prefetch_related("industries", "applications")
            .all()
        )

    def get_serializer_class(self):
        return ProductListSerializer if self.action == "list" else ProductSerializer

    @action(detail=True, methods=["post"], url_path="publish")
    def publish(self, request, pk=None):
        if not request.user.has_capability(Capability.PRODUCT_PUBLISH.value):
            return Response(
                {"error": {"code": "permission_denied", "message": "You cannot publish products."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        product = self.get_object()
        try:
            publish_product(product, actor=request.user)
        except PublishBlocked as exc:
            return Response(
                {
                    "error": {
                        "code": "publish_blocked",
                        "message": "This product cannot be published yet.",
                        "details": {"blockers": exc.blockers},
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(ProductSerializer(product).data)

    @action(detail=True, methods=["post"], url_path="unpublish")
    def unpublish(self, request, pk=None):
        if not request.user.has_capability(Capability.PRODUCT_PUBLISH.value):
            return Response(
                {"error": {"code": "permission_denied", "message": "You cannot unpublish products."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = PublishSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = unpublish_product(
            self.get_object(), actor=request.user, **serializer.validated_data
        )
        return Response(ProductSerializer(product).data)

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        product = approve_product(self.get_object(), actor=request.user)
        return Response(ProductSerializer(product).data)

    @action(detail=True, methods=["get"], url_path="publish-check")
    def publish_check(self, request, pk=None):
        """Pre-flight for the editor's publish button — same gate, no side effects."""
        blockers = validate_for_publish(self.get_object())
        return Response({"can_publish": not blockers, "blockers": blockers})
