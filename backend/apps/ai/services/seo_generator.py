"""Stage 3 of the pipeline: SEO metadata, constrained to pages that exist."""

from __future__ import annotations

import json

from ..prompts.product import (
    ACTIVE_CONTENT_REVIEW,
    ACTIVE_SEO_GENERATION,
    CONTENT_REVIEW_PROMPT,
    SEO_GENERATION_PROMPT,
)
from ..schemas import CONTENT_REVIEW_SCHEMA, SEO_SCHEMA
from .openai_client import AIResult, structured_completion
from .validators import validate_seo


def existing_paths() -> set[str]:
    """
    Every public path the model may link to.

    Passing this in — and validating against it afterwards — is what stops the
    model inventing plausible-looking URLs that would ship as broken links.
    """
    from apps.catalog.models import Category, Industry, Product
    from apps.content.models import Article

    paths = {"/", "/products", "/categories", "/industries", "/resources", "/contact"}
    paths |= {p.public_path for p in Product.objects.public().only("slug")}
    paths |= {c.public_path for c in Category.objects.public().only("slug")}
    paths |= {i.public_path for i in Industry.objects.public().only("slug")}
    paths |= {a.public_path for a in Article.objects.filter(status="published").only("slug")}
    return paths


def _link_catalogue(paths: set[str]) -> list[str]:
    # Cap the list so a large catalogue cannot blow up the prompt.
    return sorted(paths)[:200]


def generate_seo(context: dict) -> tuple[AIResult, str]:
    paths = existing_paths()
    user_content = (
        "Generate SEO metadata for this page.\n\n"
        f"Page data:\n{json.dumps(context, indent=2, ensure_ascii=False)}\n\n"
        "Existing pages you may link to (use these paths verbatim; if a suitable "
        "target is not listed, suggest no link):\n"
        f"{json.dumps(_link_catalogue(paths), indent=2)}"
    )
    result = structured_completion(
        system_prompt=SEO_GENERATION_PROMPT,
        user_content=user_content,
        json_schema=SEO_SCHEMA,
    )
    result.data, result.raw_warnings = validate_seo(result.data, allowed_paths=paths)
    return result, ACTIVE_SEO_GENERATION


def review_content(context: dict) -> tuple[AIResult, str]:
    user_content = (
        "Review this page's content and report on its quality.\n\n"
        f"{json.dumps(context, indent=2, ensure_ascii=False)}"
    )
    result = structured_completion(
        system_prompt=CONTENT_REVIEW_PROMPT,
        user_content=user_content,
        json_schema=CONTENT_REVIEW_SCHEMA,
    )
    return result, ACTIVE_CONTENT_REVIEW
