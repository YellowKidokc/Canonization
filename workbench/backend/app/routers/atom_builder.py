"""Server-side provider bridge for the prompt-driven ATOM Builder."""
from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException

from ..pipeline.provider import ProviderError, call_deepseek, extract_json_object

router = APIRouter(prefix="/api/atom-builder", tags=["atom-builder"])


@router.post("/{pass_name}")
def run_atom_builder_pass(pass_name: str, body: dict):
    if pass_name not in {"builder", "audit", "regenerate"}:
        raise HTTPException(404, "Unknown ATOM Builder pass")
    instruction = {
        "builder": (
            "Perform the ATOM BUILDER pass. Answer every enabled stable field key exactly once. "
            "Use only the preserved source and supplied accepted context. Anchors must be verbatim. "
            "Put important material that fits no field in open_discoveries. Return only the exact "
            "candidate-packet JSON required by response_schema."
        ),
        "audit": (
            "Perform the ATOM AUDIT AND REPAIR pass. Test anchors, fragments, duplicate argumentative "
            "roles, contradictions, claim modes, unsupported strengthening, category confusion, forced "
            "fields, and missing open questions. Return only JSON containing corrections, warnings, "
            "suggested_rulings, and repaired_candidate_packet."
        ),
        "regenerate": (
            "Regenerate only the requested field or section using the current packet as context. "
            "Preserve every unaffected field and return only repaired candidate-packet JSON."
        ),
    }[pass_name]
    prompt = (
        instruction
        + "\n\nAUTHORITY: CANDIDATE_DRAFT — NOT ADMITTED. Never invent UUIDs or canon status."
        + "\n\nREQUEST JSON:\n"
        + json.dumps(body, ensure_ascii=False)
    )
    try:
        return extract_json_object(call_deepseek(prompt).text)
    except ProviderError as exc:
        raise HTTPException(502, {"error_class": exc.error_class, "message": str(exc)}) from exc
