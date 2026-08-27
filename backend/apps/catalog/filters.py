"""
Catalogue filters.

`missing` powers the dashboard's SEO-defect tiles: clicking a count opens
exactly the records it counted, so a number on the dashboard is never a
dead end.
"""

from __future__ import annotations

import django_filters as filters
from django.db.models import Q

from .models import Product

MISSING_LOOKUPS = {
    "seo_title": Q(seo_title=""),
    "meta_description": Q(meta_description=""),
    "image": Q(primary_image__isnull=True),
    "category": Q(category__isnull=True),
    "description": Q(description=""),
    "keyword": Q(primary_keyword=""),
}


class ProductFilter(filters.FilterSet):
    missing = filters.CharFilter(method="filter_missing")
    seo_score_lt = filters.NumberFilter(field_name="seo_score", lookup_expr="lt")
    seo_score_gte = filters.NumberFilter(field_name="seo_score", lookup_expr="gte")
    industry = filters.NumberFilter(field_name="industries__id")

    class Meta:
        model = Product
        fields = ["status", "verified", "category", "content_origin"]

    def filter_missing(self, queryset, name, value):
        lookup = MISSING_LOOKUPS.get(value)
        # An unrecognised value returns the queryset untouched rather than
        # erroring — a stale bookmark should not break the page.
        return queryset.filter(lookup) if lookup else queryset
