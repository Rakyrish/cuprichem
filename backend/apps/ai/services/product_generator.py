"""Stage 2 of the pipeline: turn confirmed facts into catalogue copy."""

from __future__ import annotations

import json

from ..prompts.product import ACTIVE_PRODUCT_GENERATION, PRODUCT_GENERATION_PROMPT
from ..schemas import PRODUCT_CONTENT_SCHEMA
from .openai_client import AIResult, structured_completion
from .validators import validate_product_content


def build_product_context(product=None, overrides: dict | None = None) -> dict:
    """
    Assemble what the model is allowed to know.

    Only non-empty values are included: an absent key is a much clearer signal
    of "unknown" than an empty string the model may try to fill in.
    """
    context: dict[str, object] = {}
    if product is not None:
        context.update(
            {
                "product_name": product.name,
                "synonyms": product.synonyms or [],
                "category": product.category.name if product.category_id else "",
                "industries": list(product.industries.values_list("name", flat=True))
                if product.pk
                else [],
                "existing_short_description": product.short_description,
                **product.technical_dict(),
            }
        )
    if overrides:
        context.update({k: v for k, v in overrides.items() if v not in (None, "", [], {})})
    return {k: v for k, v in context.items() if v not in (None, "", [], {})}


def generate_product_content(context: dict) -> tuple[AIResult, str]:
    user_content = (
        "Generate catalogue content for this product using ONLY the confirmed "
        "information below plus well-established public chemical knowledge.\n\n"
        "Any field not listed here is UNKNOWN — do not invent it.\n\n"
        f"{json.dumps(context, indent=2, ensure_ascii=False)}"
    )
    result = structured_completion(
        system_prompt=PRODUCT_GENERATION_PROMPT,
        user_content=user_content,
        json_schema=PRODUCT_CONTENT_SCHEMA,
    )
    result.data, result.raw_warnings = validate_product_content(result.data)
    return result, ACTIVE_PRODUCT_GENERATION
