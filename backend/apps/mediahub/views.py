from __future__ import annotations

from rest_framework import serializers, status, viewsets
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from apps.accounts.models import Capability
from apps.accounts.permissions import HasCapability
from apps.audit.services import AuditAction, record

from .models import MediaAsset
from .services import cloudinary_configured, delete_asset, upload_image


class MediaAssetSerializer(serializers.ModelSerializer):
    usage_count = serializers.IntegerField(read_only=True)
    uploaded_by_email = serializers.CharField(
        source="uploaded_by.email", read_only=True, default=""
    )

    class Meta:
        model = MediaAsset
        fields = [
            "id", "kind", "public_id", "secure_url", "original_filename", "content_type",
            "byte_size", "width", "height", "alt_text", "caption", "uploaded_by",
            "uploaded_by_email", "usage_count", "created_at",
        ]
        read_only_fields = [
            "id", "public_id", "secure_url", "original_filename", "content_type",
            "byte_size", "width", "height", "uploaded_by", "created_at",
        ]


class MediaAssetViewSet(viewsets.ModelViewSet):
    serializer_class = MediaAssetSerializer
    permission_classes = [HasCapability]
    required_capabilities = {
        "GET": Capability.MEDIA_VIEW,
        "HEAD": Capability.MEDIA_VIEW,
        "OPTIONS": Capability.MEDIA_VIEW,
        "*": Capability.MEDIA_EDIT,
    }
    parser_classes = [MultiPartParser, FormParser]
    search_fields = ["original_filename", "alt_text", "caption"]
    ordering_fields = ["created_at", "byte_size"]

    def get_queryset(self):
        return MediaAsset.objects.select_related("uploaded_by").all()

    def create(self, request, *args, **kwargs):
        upload = request.FILES.get("file")
        if upload is None:
            return Response(
                {"error": {"code": "validation_error", "message": "No file was provided."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            stored = upload_image(upload)
        except ValueError as exc:
            return Response(
                {"error": {"code": "validation_error", "message": str(exc)}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        asset = MediaAsset.objects.create(
            original_filename=(upload.name or "")[:255],
            alt_text=request.data.get("alt_text", "")[:300],
            caption=request.data.get("caption", "")[:300],
            uploaded_by=request.user,
            **stored,
        )
        record(
            AuditAction.CREATE,
            target=asset,
            metadata={"storage": "cloudinary" if cloudinary_configured() else "local"},
            actor=request.user,
        )
        return Response(MediaAssetSerializer(asset).data, status=status.HTTP_201_CREATED)

    def perform_destroy(self, instance):
        """Refuse to delete an asset that a live page still points at."""
        if instance.usage_count > 0:
            from rest_framework.exceptions import ValidationError

            raise ValidationError(
                f"This image is still used by {instance.usage_count} record(s). "
                "Replace it there before deleting."
            )
        record(AuditAction.DELETE, target=instance, actor=self.request.user)
        delete_asset(instance)
        instance.delete()
