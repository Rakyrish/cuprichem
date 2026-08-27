from __future__ import annotations

from rest_framework import serializers, viewsets
from rest_framework.response import Response

from apps.accounts.models import Capability
from apps.accounts.permissions import HasCapability
from apps.audit.services import AuditAction, diff_fields, record

from .models import CompanySettings, Inquiry


class InquirySerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True, default="")

    class Meta:
        model = Inquiry
        fields = [
            "id", "kind", "status", "name", "email", "phone", "company",
            "product", "product_name", "product_text", "quantity", "message",
            "assigned_to", "internal_notes", "created_at", "updated_at",
        ]
        # Submitted content is immutable; only triage fields can be edited.
        read_only_fields = [
            "id", "created_at", "updated_at", "name", "email", "phone",
            "company", "product_text", "quantity", "message", "kind",
        ]


class InquiryViewSet(viewsets.ModelViewSet):
    serializer_class = InquirySerializer
    permission_classes = [HasCapability]
    required_capabilities = {
        "GET": Capability.INQUIRY_VIEW,
        "HEAD": Capability.INQUIRY_VIEW,
        "OPTIONS": Capability.INQUIRY_VIEW,
        "*": Capability.INQUIRY_EDIT,
    }
    filterset_fields = ["status", "kind", "assigned_to"]
    search_fields = ["name", "email", "company", "product_text"]
    ordering_fields = ["created_at", "status"]
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        return Inquiry.objects.select_related("product", "assigned_to").all()

    def perform_update(self, serializer):
        instance = serializer.save()
        record(AuditAction.UPDATE, target=instance, actor=self.request.user)


class CompanySettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanySettings
        exclude = ["id"]


class CompanySettingsViewSet(viewsets.GenericViewSet):
    """Singleton settings resource."""

    serializer_class = CompanySettingsSerializer
    permission_classes = [HasCapability]
    required_capabilities = {
        "GET": Capability.PRODUCT_VIEW,
        "*": Capability.SETTINGS_MANAGE,
    }
    queryset = CompanySettings.objects.none()

    def list(self, request):
        return self.retrieve(request)

    def retrieve(self, request, pk=None):
        return Response(CompanySettingsSerializer(CompanySettings.load()).data)

    def create(self, request):
        instance = CompanySettings.load()
        before = CompanySettingsSerializer(instance).data
        serializer = CompanySettingsSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        record(
            AuditAction.SETTINGS_UPDATE,
            target=instance,
            changes=diff_fields(before, serializer.data),
            actor=request.user,
        )
        return Response(serializer.data)
