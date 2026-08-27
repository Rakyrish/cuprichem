"""
Post-schema validation of AI output.

Structured Outputs guarantees the SHAPE of a response. It guarantees nothing
about the TRUTH of it. These checks are the second line of defence: they catch
the failure modes a schema cannot — an invented CAS number, a fabricated internal
link, an over-length meta description, a model quietly asserting a fact it was
told not to.

Nothing here silently "fixes" a value into the database. Suspect values are
downgraded to low confidence and surfaced as warnings for the reviewer.
"""

from __future__ import annotations

import re

CAS_RE = re.compile(r"^(\d{2,7})-(\d{2})-(\d)$")
FORMULA_RE = re.compile(r"^[A-Za-z0-9()·\.\s·+\-\[\]]{1,120}$")


def validate_cas_number(value: str) -> tuple[bool, str]:
    """
    Verify a CAS Registry Number against its check digit.

    The last digit is (sum of each preceding digit, read right to left, times its
    1-based position) mod 10. A hallucinated CAS number almost never satisfies
    this, which makes it a genuinely useful, zero-cost hallucination detector.
    """
    value = (value or "").strip()
    if not value:
        return True, ""

    match = CAS_RE.match(value)
    if not match:
        return False, (
            f'"{value}" is not a valid CAS number format (expected NNNNNNN-NN-N).'
        )

    digits = (match.group(1) + match.group(2))[::-1]
    checksum = sum(int(d) * (i + 1) for i, d in enumerate(digits)) % 10
    if checksum != int(match.group(3)):
        return False, (
            f'"{value}" fails the CAS check-digit test, so it is not a real CAS '
            "number. Verify it against the supplier documentation before saving."
        )
    return True, ""


def validate_formula(value: str) -> tuple[bool, str]:
    value = (value or "").strip()
    if not value:
        return True, ""
    if not FORMULA_RE.match(value):
        return False, f'"{value}" does not look like a chemical formula.'
    return True, ""


def _truncate_warning(field: str, value: str, limit: int) -> str:
    return (
        f"The generated {field} is {len(value)} characters, over the {limit}-character "
        "limit. It has been kept for review but must be shortened before publishing."
    )


def validate_image_analysis(data: dict) -> tuple[dict, list[str]]:
    """
    Check an image-analysis payload.

    A CAS number that fails its checksum is NOT discarded — the reviewer may
    recognise a simple OCR slip — but it is forced to `low` confidence and
    flagged, so it can never be mistaken for verified data.
    """
    warnings = list(data.get("warnings") or [])
    confidence = dict(data.get("confidence") or {})

    cas = (data.get("cas_number") or "").strip()
    if cas:
        ok, message = validate_cas_number(cas)
        if not ok:
            warnings.append(message)
            confidence["cas_number"] = "low"

    formula = (data.get("formula") or "").strip()
    if formula:
        ok, message = validate_formula(formula)
        if not ok:
            warnings.append(message)
            confidence["formula"] = "low"

    # A field the model listed as unknown must not also carry a value.
    for name in data.get("unknown_fields") or []:
        if (data.get(name) or "") and name in confidence:
            warnings.append(
                f"The AI reported '{name}' as unknown but still returned a value for it. "
                "Treat that value as unverified."
            )
            confidence[name] = "unknown"

    data = {**data, "warnings": warnings, "confidence": confidence}
    return data, warnings


def validate_product_content(data: dict) -> tuple[dict, list[str]]:
    warnings = list(data.get("warnings") or [])

    short = (data.get("short_description") or "").strip()
    if len(short) > 500:
        warnings.append(_truncate_warning("short description", short, 500))

    description = (data.get("description") or "").strip()
    if description and len(description.split()) < 40:
        warnings.append(
            "The generated description is shorter than 40 words, which will score as "
            "thin content. Consider regenerating with more source information."
        )

    # Guard the explicit prohibitions from the prompt.
    banned = {
        "in stock": "stock availability",
        "we stock": "stock availability",
        "iso 9001": "a certification claim",
        "iso-9001": "a certification claim",
        "certified by": "a certification claim",
        "lead time of": "a lead-time claim",
        "best price": "a price claim",
        "cheapest": "a price claim",
    }
    haystack = f"{short} {description}".lower()
    for needle, label in banned.items():
        if needle in haystack:
            warnings.append(
                f"The generated copy appears to contain {label} (\"{needle}\"). "
                "Cuprichem has not supplied this — remove it before publishing."
            )

    data = {**data, "warnings": warnings}
    return data, warnings


def validate_seo(data: dict, *, allowed_paths: set[str] | None = None) -> tuple[dict, list[str]]:
    """
    Check SEO output, and drop any internal link that points at a page which
    does not exist. Inventing URLs is a hard failure, not a warning to ignore.
    """
    warnings = list(data.get("warnings") or [])

    title = (data.get("seo_title") or "").strip()
    if len(title) > 70:
        warnings.append(_truncate_warning("SEO title", title, 70))

    desc = (data.get("meta_description") or "").strip()
    if len(desc) > 180:
        warnings.append(_truncate_warning("meta description", desc, 180))

    slug = (data.get("suggested_slug") or "").strip()
    if slug and not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug):
        warnings.append(
            f'The suggested slug "{slug}" is not a valid URL slug and was discarded.'
        )
        data = {**data, "suggested_slug": ""}

    if allowed_paths is not None:
        kept, dropped = [], []
        for link in data.get("internal_link_suggestions") or []:
            path = (link.get("path") or "").strip()
            (kept if path in allowed_paths else dropped).append(link)
        if dropped:
            warnings.append(
                f"{len(dropped)} suggested internal link(s) pointed at pages that do not "
                "exist and were discarded."
            )
        data = {**data, "internal_link_suggestions": kept}

    data = {**data, "warnings": warnings}
    return data, warnings
