from __future__ import annotations

from rest_framework import mixins, serializers, viewsets

from apps.accounts.models import Capability
from apps.accounts.permissions import HasCapability

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = [
            "id", "actor", "actor_email", "action", "target_type", "target_id",
            "target_label", "changes", "metadata", "ip_address", "created_at",
        ]
        read_only_fields = fields


class AuditLogViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """
    Read-only by design.

    There is deliberately no create/update/delete route: an audit trail that can
    be edited through the API is not evidence of anything.
    """

    serializer_class = AuditLogSerializer
    permission_classes = [HasCapability]
    required_capabilities = {"*": Capability.AUDIT_VIEW}
    filterset_fields = ["action", "target_type", "target_id", "actor"]
    search_fields = ["actor_email", "target_label"]
    ordering_fields = ["created_at"]

    def get_queryset(self):
        return AuditLog.objects.select_related("actor").all()
