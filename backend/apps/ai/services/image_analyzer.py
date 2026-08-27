"""Stage 1 of the pipeline: read a product label."""

from __future__ import annotations

from django.conf import settings

from ..prompts.product import ACTIVE_IMAGE_ANALYSIS, IMAGE_ANALYSIS_PROMPT
from ..schemas import IMAGE_ANALYSIS_SCHEMA
from .openai_client import AIResult, structured_completion
from .validators import validate_image_analysis


def analyze_product_image(image_url: str, *, hint: str = "") -> tuple[AIResult, str]:
    """
    Analyse a product image and return validated, confidence-tagged extraction.

    `image_url` must be a publicly reachable URL (Cloudinary secure_url) — the
    image is never proxied through the browser and no credential is involved.
    Returns the result plus the prompt version used, for the audit record.
    """
    user_content: list[dict] = [
        {
            "type": "text",
            "text": (
                "Extract only what is legible on this chemical product packaging."
                + (f"\n\nAdministrator hint (context, not fact): {hint}" if hint else "")
            ),
        },
        {"type": "image_url", "image_url": {"url": image_url, "detail": "high"}},
    ]

    result = structured_completion(
        system_prompt=IMAGE_ANALYSIS_PROMPT,
        user_content=user_content,
        json_schema=IMAGE_ANALYSIS_SCHEMA,
        model=settings.OPENAI_VISION_MODEL,
    )
    result.data, result.raw_warnings = validate_image_analysis(result.data)
    return result, ACTIVE_IMAGE_ANALYSIS
