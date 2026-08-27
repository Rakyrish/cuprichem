"""
JSON Schemas for structured AI output.

The model is constrained with OpenAI Structured Outputs, so responses arrive as
schema-conformant JSON rather than prose we would have to parse. Strict mode
requires every property to be listed in `required` and `additionalProperties`
to be false, so "unknown" is modelled as an explicit empty string / null rather
than an absent key — which is also what we want editorially: the model must say
it doesn't know instead of quietly omitting a field.
"""

from __future__ import annotations

CONFIDENCE_ENUM = ["high", "medium", "low", "unknown"]


def _string(description: str) -> dict:
    return {"type": "string", "description": description}


def _string_array(description: str) -> dict:
    return {"type": "array", "items": {"type": "string"}, "description": description}


#: Field-level confidence, returned alongside every extracted technical value.
_CONFIDENCE_MAP = {
    "type": "object",
    "description": (
        "Confidence for each extracted field. Use 'unknown' when the value could "
        "not be determined from the supplied material."
    ),
    "properties": {
        key: {"type": "string", "enum": CONFIDENCE_ENUM}
        for key in [
            "product_name",
            "chemical_name",
            "manufacturer",
            "cas_number",
            "formula",
            "grade",
            "purity",
            "packaging",
        ]
    },
    "required": [
        "product_name",
        "chemical_name",
        "manufacturer",
        "cas_number",
        "formula",
        "grade",
        "purity",
        "packaging",
    ],
    "additionalProperties": False,
}


IMAGE_ANALYSIS_SCHEMA = {
    "name": "product_image_analysis",
    "strict": True,
    "schema": {
        "type": "object",
        "properties": {
            "product_name": _string("Product name exactly as printed. Empty string if not legible."),
            "chemical_name": _string("Chemical name if shown. Empty string if not legible."),
            "manufacturer": _string("Manufacturer/brand if shown. Empty string if not legible."),
            "cas_number": _string("CAS number in NNNNNNN-NN-N form if printed. Empty string otherwise."),
            "formula": _string("Chemical formula if printed. Empty string otherwise."),
            "grade": _string("Grade if printed (e.g. Technical, ACS). Empty string otherwise."),
            "purity": _string("Purity if printed (e.g. 98%). Empty string otherwise."),
            "packaging": _string_array("Packaging sizes/types visible, e.g. ['25 L jerrican']."),
            "label_text": _string("Other legible label text, verbatim."),
            "confidence": _CONFIDENCE_MAP,
            "unknown_fields": _string_array("Field names that could NOT be determined from the image."),
            "warnings": _string_array(
                "Anything the reviewer must check — blurred text, ambiguous characters, "
                "possible OCR confusion (0/O, 1/l), conflicting labels."
            ),
        },
        "required": [
            "product_name",
            "chemical_name",
            "manufacturer",
            "cas_number",
            "formula",
            "grade",
            "purity",
            "packaging",
            "label_text",
            "confidence",
            "unknown_fields",
            "warnings",
        ],
        "additionalProperties": False,
    },
}


PRODUCT_CONTENT_SCHEMA = {
    "name": "product_content",
    "strict": True,
    "schema": {
        "type": "object",
        "properties": {
            "short_description": _string(
                "One or two sentences, max 300 characters, describing what the product is. "
                "Use only supplied or general public chemical knowledge."
            ),
            "description": _string(
                "Longer body copy, 80-200 words. Plain prose, no markdown headings. "
                "Never state stock levels, prices, certifications or lead times."
            ),
            "applications": _string_array(
                "Well-established real-world uses of this substance. Empty array if unsure."
            ),
            "industries": _string_array("Sectors that typically use it. Empty array if unsure."),
            "packaging_description": _string(
                "Description of packaging IF supplied by the administrator, else empty string."
            ),
            "procurement_notes": _string(
                "Neutral guidance on what a buyer should specify when requesting a quote."
            ),
            "faqs": {
                "type": "array",
                "description": "Genuinely useful buyer questions. Empty array if none are warranted.",
                "items": {
                    "type": "object",
                    "properties": {
                        "question": {"type": "string"},
                        "answer": {"type": "string"},
                    },
                    "required": ["question", "answer"],
                    "additionalProperties": False,
                },
            },
            "needs_verification": _string_array(
                "Field names where information was insufficient and a human must confirm."
            ),
            "warnings": _string_array("Any caveats the reviewer should know about."),
        },
        "required": [
            "short_description",
            "description",
            "applications",
            "industries",
            "packaging_description",
            "procurement_notes",
            "faqs",
            "needs_verification",
            "warnings",
        ],
        "additionalProperties": False,
    },
}


SEO_SCHEMA = {
    "name": "product_seo",
    "strict": True,
    "schema": {
        "type": "object",
        "properties": {
            "seo_title": _string("50-60 characters. Include the product name naturally."),
            "meta_description": _string("140-160 characters. Descriptive, not keyword-stuffed."),
            "suggested_h1": _string("The on-page H1."),
            "suggested_slug": _string("Lowercase hyphenated URL slug."),
            "primary_keyword": _string("The single dominant search term for this page."),
            "secondary_keywords": _string_array("3-6 supporting terms. No stuffing."),
            "related_search_terms": _string_array("Adjacent queries buyers use."),
            "search_intent": _string("One of: informational, commercial, transactional, navigational."),
            "internal_link_suggestions": {
                "type": "array",
                "description": (
                    "Links to pages that ALREADY EXIST. Only use paths supplied in the "
                    "context; never invent a URL."
                ),
                "items": {
                    "type": "object",
                    "properties": {
                        "path": {"type": "string"},
                        "anchor_text": {"type": "string"},
                        "reason": {"type": "string"},
                    },
                    "required": ["path", "anchor_text", "reason"],
                    "additionalProperties": False,
                },
            },
            "warnings": _string_array("Caveats for the reviewer."),
        },
        "required": [
            "seo_title",
            "meta_description",
            "suggested_h1",
            "suggested_slug",
            "primary_keyword",
            "secondary_keywords",
            "related_search_terms",
            "search_intent",
            "internal_link_suggestions",
            "warnings",
        ],
        "additionalProperties": False,
    },
}


CONTENT_REVIEW_SCHEMA = {
    "name": "content_review",
    "strict": True,
    "schema": {
        "type": "object",
        "properties": {
            "strengths": _string_array("What the page already does well."),
            "weaknesses": _string_array("Concrete problems."),
            "missing_information": _string_array("Specific facts the page should state but doesn't."),
            "search_intent_alignment": _string("How well the content matches the target intent."),
            "readability": _string("Plain-language assessment."),
            "recommendations": _string_array(
                "Actionable steps. Each must name what to change and why — never 'improve SEO'."
            ),
        },
        "required": [
            "strengths",
            "weaknesses",
            "missing_information",
            "search_intent_alignment",
            "readability",
            "recommendations",
        ],
        "additionalProperties": False,
    },
}
