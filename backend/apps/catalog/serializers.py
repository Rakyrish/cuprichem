from __future__ import annotations

from rest_framework import serializers

from apps.core.models import unique_slug
from apps.seo.scoring import health_band

from .models import Application, Category, Industry, Product, ProductRedirect


class SeoFieldsSerializerMixin(metaclass=serializers.SerializerMetaclass):
    SEO_FIELDS = [
        "seo_title",
        "meta_description",
        "canonical_url",
        "robots_index",
        "robots_follow",
        "og_title",
        "og_description",
        "og_image",
        "schema_type",
        "primary_keyword",
        "secondary_keywords",
        "seo_score",
        "seo_issues",
        "seo_checked_at",
    ]


class ApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Application
        fields = ["id", "slug", "name", "description"]
        extra_kwargs = {"slug": {"required": False, "allow_blank": True}}

    def validate(self, attrs):
        if not attrs.get("slug"):
            attrs["slug"] = unique_slug(
                Application, attrs.get("name", ""), instance_pk=self.instance.pk if self.instance else None
            )
        return attrs


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True, required=False)
    public_path = serializers.CharField(read_only=True)
    is_public = serializers.BooleanField(read_only=True)

    class Meta:
        model = Category
        fields = [
            "id", "slug", "name", "summary", "intro", "status", "verified",
            "image", "display_order", "public_path", "is_public", "product_count",
            "created_at", "updated_at",
        ] + SeoFieldsSerializerMixin.SEO_FIELDS
        read_only_fields = ["id", "created_at", "updated_at", "seo_score", "seo_issues", "seo_checked_at"]
        extra_kwargs = {"slug": {"required": False, "allow_blank": True}}

    def validate(self, attrs):
        if not attrs.get("slug") and not (self.instance and self.instance.slug):
            attrs["slug"] = unique_slug(Category, attrs.get("name", ""))
        return attrs


class IndustrySerializer(serializers.ModelSerializer):
    public_path = serializers.CharField(read_only=True)
    is_public = serializers.BooleanField(read_only=True)

    class Meta:
        model = Industry
        fields = [
            "id", "slug", "name", "summary", "intro", "status", "verified",
            "image", "display_order", "public_path", "is_public",
            "created_at", "updated_at",
        ] + SeoFieldsSerializerMixin.SEO_FIELDS
        read_only_fields = ["id", "created_at", "updated_at", "seo_score", "seo_issues", "seo_checked_at"]
        extra_kwargs = {"slug": {"required": False, "allow_blank": True}}

    def validate(self, attrs):
        if not attrs.get("slug") and not (self.instance and self.instance.slug):
            attrs["slug"] = unique_slug(Industry, attrs.get("name", ""))
        return attrs


class ProductListSerializer(serializers.ModelSerializer):
    """Deliberately lean — the product table renders thousands of these."""

    category_name = serializers.CharField(source="category.name", read_only=True, default="")
    image_url = serializers.CharField(source="primary_image.secure_url", read_only=True, default="")
    seo_band = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id", "slug", "name", "category", "category_name", "status", "verified",
            "content_origin", "seo_score", "seo_band", "image_url", "updated_at",
            "created_at", "published_at",
        ]

    def get_seo_band(self, obj) -> str:
        return health_band(obj.seo_score, obj.seo_issues or [])


class ProductSerializer(serializers.ModelSerializer):
    public_path = serializers.CharField(read_only=True)
    is_public = serializers.BooleanField(read_only=True)
    technical = serializers.SerializerMethodField()
    seo_band = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id", "slug", "name", "synonyms", "category", "industries", "applications",
            "related_products", "short_description", "description", "procurement_notes",
            "cas_number", "formula", "molecular_weight", "grade", "purity", "appearance",
            "packaging", "manufacturer", "field_confidence", "verified_fields", "faqs",
            "primary_image", "status", "verified", "content_origin", "published_at",
            "approved_at", "approved_by", "public_path", "is_public", "technical",
            "seo_band", "created_at", "updated_at",
        ] + SeoFieldsSerializerMixin.SEO_FIELDS
        read_only_fields = [
            "id", "created_at", "updated_at", "published_at", "approved_at",
            "approved_by", "seo_score", "seo_issues", "seo_checked_at", "content_origin",
        ]
        extra_kwargs = {"slug": {"required": False, "allow_blank": True}}

    def get_technical(self, obj) -> dict:
        return {
            key: {"value": value, "confidence": obj.confidence_for(key)}
            for key, value in obj.technical_dict().items()
        }

    def get_seo_band(self, obj) -> str:
        return health_band(obj.seo_score, obj.seo_issues or [])

    def validate_slug(self, value):
        if value and Product.objects.filter(slug=value).exclude(
            pk=self.instance.pk if self.instance else None
        ).exists():
            raise serializers.ValidationError("A product with this slug already exists.")
        return value

    def validate_synonyms(self, value):
        if not isinstance(value, list) or not all(isinstance(v, str) for v in value):
            raise serializers.ValidationError("Synonyms must be a list of strings.")
        return value[:30]

    def validate_faqs(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("FAQs must be a list.")
        for item in value:
            if not isinstance(item, dict) or "question" not in item or "answer" not in item:
                raise serializers.ValidationError(
                    "Each FAQ needs a 'question' and an 'answer'."
                )
        return value

    def validate(self, attrs):
        if not attrs.get("slug") and not (self.instance and self.instance.slug):
            attrs["slug"] = unique_slug(Product, attrs.get("name", ""))
        return attrs


class PublishSerializer(serializers.Serializer):
    """Unpublish options. A 301 must name where the URL now goes."""

    mode = serializers.ChoiceField(
        choices=ProductRedirect.Mode.choices, default=ProductRedirect.Mode.GONE
    )
    to_path = serializers.CharField(required=False, allow_blank=True, max_length=300)
    reason = serializers.CharField(required=False, allow_blank=True, max_length=300)

    def validate(self, attrs):
        if attrs.get("mode") == ProductRedirect.Mode.REDIRECT and not attrs.get("to_path"):
            raise serializers.ValidationError(
                {"to_path": "A replacement path is required for a 301 redirect."}
            )
        return attrs
