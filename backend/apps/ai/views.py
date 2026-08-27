from __future__ import annotations

from django.utils import timezone
from rest_framework import mixins, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from apps.accounts.models import Capability
from apps.accounts.permissions import HasCapability
from apps.audit.services import AuditAction, record
from apps.catalog.models import Product
from apps.catalog.serializers import ProductSerializer
from apps.catalog.services import apply_ai_payload
from apps.core.exceptions import ServiceUnavailable

from .models import AIJob, AIJobStatus, AIOperation, ReviewState
from .services.image_analyzer import analyze_product_image
from .services.openai_client import AIError, is_configured
from .services.product_generator import build_product_context, generate_product_content
from .services.seo_generator import generate_seo, review_content


class AIJobSerializer(serializers.ModelSerializer):
    duration_seconds = serializers.FloatField(read_only=True)
    requested_by_email = serializers.CharField(
        source="requested_by.email", read_only=True, default=""
    )

    class Meta:
        model = AIJob
        fields = [
            "id", "operation", "status", "product", "requested_by", "requested_by_email",
            "input_summary", "result", "review_state", "reviewed_by", "reviewed_at",
            "model_name", "prompt_version", "prompt_tokens", "completion_tokens",
            "total_tokens", "error_code", "error_message", "started_at", "completed_at",
            "duration_seconds", "created_at",
        ]
        read_only_fields = fields


class AnalyzeImageSerializer(serializers.Serializer):
    image_url = serializers.URLField()
    hint = serializers.CharField(required=False, allow_blank=True, max_length=500)
    product = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), required=False, allow_null=True
    )


class GenerateSerializer(serializers.Serializer):
    product = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), required=False, allow_null=True
    )
    overrides = serializers.DictField(required=False, default=dict)


class AcceptSerializer(serializers.Serializer):
    """Which fields the reviewer accepted. Nothing is applied without this."""

    fields = serializers.ListField(child=serializers.CharField(), allow_empty=False)


def _guard_configured():
    if not is_configured():
        raise ServiceUnavailable(
            "AI service is not configured. Set OPENAI_API_KEY on the server.",
            code="ai_not_configured",
        )


def _run(operation: str, *, user, product, input_summary: dict, runner) -> AIJob:
    """
    Execute one AI stage and record it as a job.

    The job row is created BEFORE the call and updated after, so a crash or
    timeout still leaves a durable record of what was attempted — the admin's
    work is never lost because the model failed (§37/§70).
    """
    job = AIJob.objects.create(
        operation=operation,
        status=AIJobStatus.PROCESSING,
        requested_by=user,
        product=product,
        input_summary=input_summary,
        started_at=timezone.now(),
    )
    try:
        result, prompt_version = runner()
    except (AIError, ServiceUnavailable) as exc:
        job.status = AIJobStatus.FAILED
        job.error_code = getattr(exc, "code", "ai_error")
        job.error_message = str(getattr(exc, "message", exc))
        job.completed_at = timezone.now()
        job.save()
        raise

    job.status = AIJobStatus.COMPLETED
    job.result = result.data
    job.model_name = result.model
    job.prompt_version = prompt_version
    job.prompt_tokens = result.prompt_tokens
    job.completion_tokens = result.completion_tokens
    job.total_tokens = result.total_tokens
    job.completed_at = timezone.now()
    job.save()

    # Attribute to the product when there is one; otherwise the job itself is
    # the subject (AI Studio runs before a product record exists).
    if product is not None:
        record(
            AuditAction.AI_GENERATE,
            target=product,
            metadata={"operation": operation, "job_id": job.pk, "model": result.model},
            actor=user,
        )
    else:
        record(
            AuditAction.AI_GENERATE,
            target_type="AIJob",
            target_id=str(job.pk),
            target_label=operation,
            metadata={"operation": operation, "model": result.model},
            actor=user,
        )
    return job


class AIViewSet(viewsets.GenericViewSet):
    permission_classes = [HasCapability]
    required_capabilities = {"*": Capability.AI_GENERATE, "GET": Capability.AI_GENERATE}
    throttle_classes = [ScopedRateThrottle]
    queryset = AIJob.objects.none()

    def get_throttles(self):
        self.throttle_scope = "ai_analyze" if self.action == "analyze_image" else "ai_generate"
        return super().get_throttles()

    @action(detail=False, methods=["post"], url_path="analyze-image")
    def analyze_image(self, request):
        _guard_configured()
        serializer = AnalyzeImageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        product = data.get("product")

        job = _run(
            AIOperation.IMAGE_ANALYZE,
            user=request.user,
            product=product,
            input_summary={"image_url": data["image_url"], "hint": data.get("hint", "")},
            runner=lambda: analyze_product_image(data["image_url"], hint=data.get("hint", "")),
        )
        return Response(AIJobSerializer(job).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="generate-product")
    def generate_product(self, request):
        _guard_configured()
        serializer = GenerateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = serializer.validated_data.get("product")
        context = build_product_context(product, serializer.validated_data.get("overrides"))

        if not context.get("product_name"):
            return Response(
                {
                    "error": {
                        "code": "insufficient_input",
                        "message": "A product name is required before content can be generated.",
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        job = _run(
            AIOperation.PRODUCT_GENERATE,
            user=request.user,
            product=product,
            input_summary=context,
            runner=lambda: generate_product_content(context),
        )
        return Response(AIJobSerializer(job).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="generate-seo")
    def generate_seo_meta(self, request):
        _guard_configured()
        serializer = GenerateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = serializer.validated_data.get("product")
        context = build_product_context(product, serializer.validated_data.get("overrides"))

        job = _run(
            AIOperation.SEO_GENERATE,
            user=request.user,
            product=product,
            input_summary=context,
            runner=lambda: generate_seo(context),
        )
        return Response(AIJobSerializer(job).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="review-content")
    def review(self, request):
        _guard_configured()
        serializer = GenerateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = serializer.validated_data.get("product")
        context = build_product_context(product, serializer.validated_data.get("overrides"))

        job = _run(
            AIOperation.CONTENT_REVIEW,
            user=request.user,
            product=product,
            input_summary=context,
            runner=lambda: review_content(context),
        )
        return Response(AIJobSerializer(job).data, status=status.HTTP_201_CREATED)


class AIJobViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = AIJobSerializer
    permission_classes = [HasCapability]
    required_capabilities = {"*": Capability.AI_GENERATE}
    filterset_fields = ["operation", "status", "review_state", "product"]
    ordering_fields = ["created_at", "total_tokens"]

    def get_queryset(self):
        return AIJob.objects.select_related("requested_by", "product").all()

    @action(detail=True, methods=["post"], url_path="accept")
    def accept(self, request, pk=None):
        """
        Apply selected fields from a completed job to its product.

        This is the ONLY route from AI output into product data, and it requires
        an explicit field list — there is no "accept everything" shortcut.
        """
        job = self.get_object()
        if job.status != AIJobStatus.COMPLETED:
            return Response(
                {"error": {"code": "job_not_complete", "message": "This job has no usable result."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if job.product is None:
            return Response(
                {
                    "error": {
                        "code": "no_product",
                        "message": "This job is not attached to a product. Create the product first.",
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = AcceptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        accepted = serializer.validated_data["fields"]

        payload = {k: v for k, v in (job.result or {}).items() if k in accepted}
        outcome = apply_ai_payload(
            job.product,
            payload,
            fields=accepted,
            confidence=(job.result or {}).get("confidence"),
            actor=request.user,
        )

        job.review_state = (
            ReviewState.ACCEPTED if len(accepted) == len(payload) else ReviewState.PARTIAL
        )
        job.reviewed_by = request.user
        job.reviewed_at = timezone.now()
        job.save(update_fields=["review_state", "reviewed_by", "reviewed_at", "updated_at"])

        return Response(
            {"outcome": outcome, "product": ProductSerializer(job.product).data}
        )

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        job = self.get_object()
        job.review_state = ReviewState.REJECTED
        job.reviewed_by = request.user
        job.reviewed_at = timezone.now()
        job.save(update_fields=["review_state", "reviewed_by", "reviewed_at", "updated_at"])
        record(AuditAction.AI_REJECT, target=job.product, metadata={"job_id": job.pk}, actor=request.user)
        return Response(AIJobSerializer(job).data)
