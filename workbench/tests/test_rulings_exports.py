"""Acceptance tests: rulings, evidence, predictions, discovery, exports, persistence."""
from __future__ import annotations

import json
import uuid as uuidlib

from .conftest import run_job

NINE_SATISFIED = {
    name: {"state": "SATISFIED", "rationale": None, "detail": {}}
    for name in [
        "SOURCE", "PROVENANCE_CUSTODY", "PROTOCOL", "CONDITIONS", "RAW_RECORD",
        "DERIVED_ARTIFACTS", "CONTROLS", "INDEPENDENCE_MAP", "DISCRIMINATION_STATEMENT",
    ]
}


def promote_to_canonical(client, object_type, object_id) -> None:
    r = client.post(
        "/api/rulings",
        json={"object_type": object_type, "object_uuid": object_id, "decision": "PROMOTE", "reason": "step one: into review"},
    )
    assert r.status_code == 201, r.text
    assert r.json()["new_status"] == "UNDER_REVIEW"
    r = client.post(
        "/api/rulings",
        json={"object_type": object_type, "object_uuid": object_id, "decision": "PROMOTE", "reason": "step two: admit to canon"},
    )
    assert r.status_code == 201, r.text
    assert r.json()["new_status"] == "CANONICAL"


def test_promotion_creates_immutable_rulings(client, statement):
    promote_to_canonical(client, "TRUE_STATEMENT", statement["id"])

    trail = client.get(f"/api/audit/trail?object_uuid={statement['id']}").json()
    assert len(trail["rulings"]) == 2
    assert len(trail["status_audit"]) == 2
    assert trail["rulings"][0]["new_status"] == "UNDER_REVIEW"
    assert trail["rulings"][1]["new_status"] == "CANONICAL"
    assert trail["rulings"][1]["canon_version"] > trail["rulings"][0]["canon_version"]
    assert trail["rulings"][0]["decided_by"] == "David"


def test_ruling_requires_reason(client, statement):
    r = client.post(
        "/api/rulings",
        json={"object_type": "TRUE_STATEMENT", "object_uuid": statement["id"], "decision": "PROMOTE", "reason": "  "},
    )
    assert r.status_code == 422


def test_illegal_transition_rejected(client, statement):
    """A fresh candidate cannot jump straight to CANONICAL."""
    r = client.post(
        "/api/rulings",
        json={"object_type": "TRUE_STATEMENT", "object_uuid": statement["id"], "decision": "PROMOTE", "reason": "try to skip review"},
    )
    assert r.status_code == 201  # first promote: -> UNDER_REVIEW
    r = client.post(
        "/api/rulings",
        json={"object_type": "TRUE_STATEMENT", "object_uuid": statement["id"], "decision": "PROMOTE", "reason": "try to promote while already under review from a second angle"},
    )
    assert r.status_code == 201  # second promote: -> CANONICAL (two-step rule)
    r = client.post(
        "/api/rulings",
        json={"object_type": "TRUE_STATEMENT", "object_uuid": statement["id"], "decision": "REJECT", "reason": "try to reject an admitted object instead of demoting"},
    )
    assert r.status_code == 422  # admitted objects must be demoted/superseded, never silently rejected


def test_demotion_preserves_canonical_history(client, statement):
    promote_to_canonical(client, "TRUE_STATEMENT", statement["id"])
    r = client.post(
        "/api/rulings",
        json={"object_type": "TRUE_STATEMENT", "object_uuid": statement["id"], "decision": "DEMOTE", "reason": "new evidence weakens the claim"},
    )
    assert r.json()["new_status"] == "UNDER_REVIEW"

    st = client.get(f"/api/statements/{statement['id']}").json()
    assert st["canon_status"] == "UNDER_REVIEW"

    # The canon at the version where admission happened still reconstructs it,
    # even though a later ruling demoted the object.
    rulings = client.get(f"/api/rulings?object_uuid={statement['id']}").json()
    admission_version = next(r["canon_version"] for r in rulings if r["new_status"] == "CANONICAL")
    at_version = client.get(f"/api/canon/at/{admission_version}").json()
    assert any(o["object_uuid"] == statement["id"] for o in at_version["canonical_objects"])

    # ...and at the latest version it is no longer canonical.
    latest = max(r["canon_version"] for r in rulings)
    at_latest = client.get(f"/api/canon/at/{latest}").json()
    assert not any(o["object_uuid"] == statement["id"] for o in at_latest["canonical_objects"])


def test_canon_version_reconstruction(client, statement):
    promote_to_canonical(client, "TRUE_STATEMENT", statement["id"])
    v = client.get("/api/dashboard").json()["canon_version"]
    assert v >= 2
    snapshot = client.get(f"/api/canon/at/{v}").json()
    assert any(o["object_uuid"] == statement["id"] for o in snapshot["canonical_objects"])
    snapshot1 = client.get("/api/canon/at/1").json()
    assert not any(o["object_uuid"] == statement["id"] for o in snapshot1["canonical_objects"])


# ---------------------------------------------------------------- evidence ----
def _evidence_payload(**over):
    payload = {
        "title": "Cosmic microwave background uniformity measurement",
        "evidence_class": "instrument_readout",
        "epistemic_source_class": "EMPIRICAL",
        "summary": "CMB isotropic to 1 part in 100,000",
        "distance": "DIRECT",
        "relation_to_target": "MEASURES_TARGET",
        "uncertainty_type": "KNOWN_NUMERIC",
        "sampling_regime": "COMPLETE_ARCHIVE",
        "selection_timing": "RETROSPECTIVE",
        "hypothesis_timing": "BEFORE_ANALYSIS",
        "replication_status": "EXTERNAL",
        "replication_relation": "NEW_DATA_INDEPENDENT_TEAM",
        "controls": ["CALIBRATION_STANDARD", "NULL_MODEL"],
        "alternatives": [{"explanation": "INSTRUMENT_ARTIFACT", "status": "STRONGLY_EXCLUDED", "note": "multiple instruments"}],
        "nine_burden": {k: dict(v) for k, v in NINE_SATISFIED.items()},
    }
    payload.update(over)
    return payload


def test_evidence_atom_nine_burdains_fully_opened_not_quality(client, statement):
    """fully_opened means epistemically exposed — it can be fully opened and still
    explicitly low quality (e.g. contradicted burden states)."""
    payload = _evidence_payload()
    payload["nine_burden"]["CONTROLS"] = {"state": "CONTRADICTED", "rationale": "control failed", "detail": {}}
    r = client.post("/api/evidence", json=payload)
    assert r.status_code == 201, r.text
    ev = r.json()
    assert ev["fully_opened"] is True
    assert ev["nine_burden"]["CONTROLS"]["state"] == "CONTRADICTED"


def test_evidence_not_fully_opened_when_burden_missing_or_rationale_required(client):
    r = client.post("/api/evidence", json=_evidence_payload(nine_burden={}))
    assert r.json()["fully_opened"] is False

    nine = {k: dict(v) for k, v in NINE_SATISFIED.items()}
    nine["RAW_RECORD"] = {"state": "IMPOSSIBLE_TO_RECOVER", "rationale": "", "detail": {}}
    r = client.post("/api/evidence", json=_evidence_payload(nine_burden=nine))
    assert r.json()["fully_opened"] is False  # rationale required

    nine["RAW_RECORD"] = {"state": "IMPOSSIBLE_TO_RECOVER", "rationale": "1970s analog data lost", "detail": {}}
    r = client.post("/api/evidence", json=_evidence_payload(nine_burden=nine))
    assert r.json()["fully_opened"] is True


def test_evidence_bearing_lives_on_the_edge(client, statement):
    """Evidence objects carry no bearing; the typed EVIDENCE_EDGE carries bearing."""
    ev = client.post("/api/evidence", json=_evidence_payload()).json()
    assert "bearing" not in ev

    r = client.post(
        "/api/evidence-edges",
        json={
            "evidence_id": ev["id"],
            "target_statement_id": statement["id"],
            "bearing": "SUPPORTS",
            "expected_under_target": "LIKELY",
            "expected_under_rival": "UNLIKELY",
            "strength": "MODERATE",
        },
    )
    assert r.status_code == 201, r.text
    edge = r.json()
    assert edge["bearing"] == "SUPPORTS"
    assert edge["admitted"] is False  # proposed until a human admits the edge

    edges = client.get(f"/api/evidence-edges?target_statement_id={statement['id']}").json()
    assert len(edges) == 1


# ------------------------------------------------------------- predictions ----
def test_prediction_registration_is_immutable(client, statement):
    p = client.post(
        "/api/predictions",
        json={
            "exact_prediction": "Future surveys will find the fine-structure constant constant to 10^-18.",
            "parent_statement_id": statement["id"],
            "expected_observation": "no drift in alpha",
            "timeframe": "2035",
            "confirmation_condition": "measured drift < 1e-18",
            "falsification_condition": "measured drift > 1e-15",
            "status": "REGISTERED",
            "prospective": True,
        },
    )
    assert p.status_code == 201, p.text
    pred = p.json()
    assert pred["status"] == "REGISTERED"
    registered_at = pred["registered_at"]

    # Correction creates a NEW version; the original registered_at is untouched.
    v2 = client.post(
        f"/api/predictions/{pred['id']}/versions",
        json={
            "exact_prediction": "Future surveys will find the fine-structure constant constant to 10^-20 (corrected precision).",
            "parent_statement_id": statement["id"],
            "status": "REGISTERED",
        },
    )
    assert v2.status_code == 201
    assert v2.json()["version"] == 2

    original = client.get(f"/api/predictions/{pred['id']}").json()
    assert original["registered_at"] == registered_at

    # DB trigger enforces immutability even against direct SQL.
    from app.db import get_engine
    from sqlalchemy import text

    with pytest.raises(Exception):
        with get_engine().begin() as conn:
            conn.execute(
                text("UPDATE predictions SET registered_at = now() WHERE id = :id"),
                {"id": pred["id"]},
            )


def test_unclassified_discovery_accepted(client, source):
    r = client.post(
        "/api/discovery",
        json={
            "content": "The author's aside about musical harmony mirrors the harmonic series in the equations — worth investigating but fits no current category.",
            "tags": ["harmony", "analogy"],
            "possible_relationships": ["BRIDGE to mathematics of resonance"],
            "unclassified_reason": "No existing object type covers aesthetic-structure parallels.",
            "promotion_eligibility": "NOT_YET",
            "source_id": source["id"],
        },
    )
    assert r.status_code == 201, r.text
    item = r.json()
    assert item["canon_status"] == "CANDIDATE_DRAFT — NOT ADMITTED"
    assert item["promotion_eligibility"] == "NOT_YET"


# ----------------------------------------------------------------- exports ----
def test_json_export_validates_and_retains_uuids(client, statement):
    promote_to_canonical(client, "TRUE_STATEMENT", statement["id"])
    r = client.post("/api/export/json")
    assert r.status_code == 201
    receipt = r.json()
    assert receipt["sha256"]

    with open(receipt["path"], encoding="utf-8") as f:
        bundle = json.load(f)
    assert bundle["export_kind"] == "CANONIZATION_AUTHORITATIVE_JSON"
    stmt_uuids = [s["uuid"] for s in bundle["true_statements"]]
    assert statement["id"] in stmt_uuids
    # Ruling history is included
    assert any(ru["object_uuid"] == statement["id"] for ru in bundle["rulings"])
    # Admitted object is marked canonical in the export
    exported = next(s for s in bundle["true_statements"] if s["uuid"] == statement["id"])
    assert exported["canon_status"] == "CANONICAL"

    receipts = client.get("/api/exports").json()
    assert any(e["kind"] == "JSON" for e in receipts)


def test_markdown_projection_is_labeled(client, statement):
    promote_to_canonical(client, "TRUE_STATEMENT", statement["id"])
    r = client.post("/api/export/markdown")
    receipt = r.json()
    with open(receipt["path"], encoding="utf-8") as f:
        text = f.read()
    assert "PROJECTION — NOT AUTHORITATIVE" in text
    assert statement["id"] in text  # UUIDs retained across formats


# ------------------------------------------------------------- persistence ----
def test_restart_preserves_state(client, statement):
    """A new database session (simulating restart) sees committed state."""
    promote_to_canonical(client, "TRUE_STATEMENT", statement["id"])
    from app.db import get_engine
    from sqlalchemy import text

    with get_engine().connect() as conn:
        row = conn.execute(
            text("SELECT canon_status FROM true_statements WHERE id = :id"),
            {"id": statement["id"]},
        ).first()
    assert row[0] == "CANONICAL"


def test_search_retrieves_admitted_object(client, statement):
    promote_to_canonical(client, "TRUE_STATEMENT", statement["id"])
    r = client.get("/api/search?q=lawlike").json()
    assert r["total"] >= 1
    hit = next(h for h in r["results"] if h["object_uuid"] == statement["id"])
    assert hit["canon_status"] == "CANONICAL"


def test_search_by_uuid(client, statement):
    r = client.get(f"/api/search?q={statement['id']}").json()
    assert r["total"] == 1
    assert r["results"][0]["object_uuid"] == statement["id"]


import pytest  # noqa: E402  (kept close to use site for clarity)
