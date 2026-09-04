"""Server-side LLM provider client. API keys never leave the backend."""
from __future__ import annotations

import json
from dataclasses import dataclass

import httpx
from json_repair import repair_json

from ..config import get_settings


@dataclass
class ProviderResult:
    text: str
    model: str
    tokens_used: int | None
    latency_ms: int


class ProviderError(Exception):
    """Base error; error_class distinguishes failure categories for receipts."""

    error_class = "PROVIDER_ERROR"

    def __init__(self, message: str, *, detail: dict | None = None):
        super().__init__(message)
        self.detail = detail or {}


class ConfigError(ProviderError):
    error_class = "CONFIG_ERROR"


class HttpError(ProviderError):
    error_class = "HTTP_ERROR"


class TimeoutError_(ProviderError):
    error_class = "TIMEOUT"


class ParseError(ProviderError):
    error_class = "PARSE_ERROR"


def call_deepseek(prompt: str) -> ProviderResult:
    """Single DeepSeek chat call. Returns raw text — parsing is the caller's job."""
    import time

    settings = get_settings()
    if not settings.deepseek_api_key:
        raise ConfigError("DEEPSEEK_API_KEY is not configured (server-side .env)")
    headers = {
        "Authorization": f"Bearer {settings.deepseek_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.deepseek_model,
        "messages": [
            {"role": "system", "content": "You are a precise extraction engine. Output only the requested JSON."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
    }
    start = time.monotonic()
    try:
        resp = httpx.post(
            settings.deepseek_base_url,
            headers=headers,
            json=payload,
            timeout=settings.ai_timeout_seconds,
        )
    except httpx.TimeoutException as e:
        raise TimeoutError_(f"DeepSeek timeout after {settings.ai_timeout_seconds}s") from e
    except httpx.HTTPError as e:
        raise HttpError(f"DeepSeek transport error: {e}") from e
    latency_ms = int((time.monotonic() - start) * 1000)
    if resp.status_code != 200:
        raise HttpError(
            f"DeepSeek HTTP {resp.status_code}",
            detail={"status_code": resp.status_code, "body": resp.text[:2000]},
        )
    data = resp.json()
    try:
        text = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as e:
        raise ParseError("DeepSeek response missing choices[0].message.content", detail={"body": str(data)[:2000]}) from e
    usage = data.get("usage") or {}
    return ProviderResult(
        text=text,
        model=settings.deepseek_model,
        tokens_used=usage.get("total_tokens"),
        latency_ms=latency_ms,
    )


def extract_json_object(text: str) -> dict:
    """Pull the outermost JSON object out of a model response. Raises ParseError."""
    text = text.strip()
    if text.startswith("```"):
        # strip code fences
        lines = text.splitlines()
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines).strip()
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ParseError("No JSON object found in model response", detail={"head": text[:500]})
    candidate = text[start : end + 1]
    try:
        return json.loads(candidate)
    except json.JSONDecodeError as e:
        # Providers occasionally emit an otherwise valid object with a missing
        # comma, dangling comma, or unescaped quote even in JSON response mode.
        # Repair only the extracted outer object, then require strict JSON again.
        try:
            repaired = repair_json(candidate)
            parsed = json.loads(repaired)
            if not isinstance(parsed, dict):
                raise ValueError("repaired payload is not a JSON object")
            return parsed
        except (json.JSONDecodeError, TypeError, ValueError) as repair_error:
            raise ParseError(
                f"JSON decode failed: {e}",
                detail={"head": candidate[:500], "repair_error": str(repair_error)},
            ) from e
