"""
The single place the OpenAI SDK is touched.

Everything else in the codebase calls `structured_completion()`. Centralising it
means model choice, timeouts, retries, usage accounting and error translation
are configured once, and the API key never leaks into a view, a serializer or a
log line.
"""

from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass, field
from typing import Any

from django.conf import settings

from apps.core.exceptions import ServiceUnavailable

logger = logging.getLogger("cuprichem.ai")


class AIError(Exception):
    """A recoverable AI failure. Carries a stable code for the frontend."""

    def __init__(self, message: str, *, code: str = "ai_error"):
        super().__init__(message)
        self.message = message
        self.code = code


@dataclass
class AIResult:
    data: dict[str, Any]
    model: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    raw_warnings: list[str] = field(default_factory=list)


def is_configured() -> bool:
    return bool(settings.OPENAI_API_KEY)


def _client():
    """
    Build a client on demand.

    Not cached at import time so a key rotated in the environment takes effect on
    the next call, and so the module imports cleanly when no key is configured.
    """
    if not is_configured():
        raise ServiceUnavailable(
            "AI service is not configured. Set OPENAI_API_KEY on the server.",
            code="ai_not_configured",
        )
    try:
        from openai import OpenAI
    except ImportError as exc:  # pragma: no cover
        raise ServiceUnavailable(
            "The OpenAI SDK is not installed on the server.", code="ai_sdk_missing"
        ) from exc

    return OpenAI(
        api_key=settings.OPENAI_API_KEY,
        timeout=settings.OPENAI_TIMEOUT,
        max_retries=0,  # retries are handled here so each attempt can be logged
    )


def _sleep_backoff(attempt: int) -> None:
    time.sleep(min(2**attempt, 8))


def structured_completion(
    *,
    system_prompt: str,
    user_content: list[dict] | str,
    json_schema: dict,
    model: str | None = None,
    max_output_tokens: int | None = None,
) -> AIResult:
    """
    Run one schema-constrained completion.

    `user_content` is either a plain string or a content-part list (used for
    vision, where an image part is included). Returns parsed, schema-conformant
    data — callers never see raw text.
    """
    client = _client()
    model = model or settings.OPENAI_MODEL
    max_tokens = max_output_tokens or settings.OPENAI_MAX_OUTPUT_TOKENS

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_content},
    ]

    last_error: Exception | None = None
    for attempt in range(settings.OPENAI_MAX_RETRIES + 1):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                response_format={"type": "json_schema", "json_schema": json_schema},
                max_completion_tokens=max_tokens,
            )
            choice = response.choices[0]

            if getattr(choice, "finish_reason", "") == "length":
                raise AIError(
                    "The AI response was cut off before it finished. Try again, or "
                    "reduce the amount of input material.",
                    code="ai_truncated",
                )

            # Structured Outputs can still refuse (safety); that is not JSON.
            refusal = getattr(choice.message, "refusal", None)
            if refusal:
                raise AIError(f"The AI declined this request: {refusal}", code="ai_refused")

            content = choice.message.content or ""
            try:
                data = json.loads(content)
            except json.JSONDecodeError as exc:
                raise AIError(
                    "The AI returned malformed data. Nothing was saved — please retry.",
                    code="ai_invalid_json",
                ) from exc

            usage = getattr(response, "usage", None)
            return AIResult(
                data=data,
                model=model,
                prompt_tokens=getattr(usage, "prompt_tokens", 0) or 0,
                completion_tokens=getattr(usage, "completion_tokens", 0) or 0,
                total_tokens=getattr(usage, "total_tokens", 0) or 0,
            )

        except AIError:
            # Deterministic failures (refusal, malformed JSON) — do not retry.
            raise
        except Exception as exc:
            last_error = exc
            # Log the type and message only. Never log the request payload: it
            # can contain the key in a header repr on some SDK exceptions.
            logger.warning(
                "OpenAI call failed (attempt %s/%s): %s",
                attempt + 1,
                settings.OPENAI_MAX_RETRIES + 1,
                type(exc).__name__,
            )
            if attempt < settings.OPENAI_MAX_RETRIES:
                _sleep_backoff(attempt)

    raise AIError(
        "The AI service could not be reached. Your work has been kept — please retry.",
        code="ai_unavailable",
    ) from last_error
