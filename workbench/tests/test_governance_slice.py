"""Acceptance tests: sources, preservation, pipeline governance."""
from __future__ import annotations

import hashlib

from app.pipeline.provider import extract_json_object

from .conftest import SAMPLE_PAPER, run_job


def test_intake_preserves_bytes_and_hash(client, source):
    """Originals remain unchanged; preserved bytes hash to the recorded SHA-256."""
    content = client.get(f"/api/sources/{source['id']}/content").content
    assert content == SAMPLE_PAPER.encode("utf-8")
    assert hashlib.sha256(content).hexdigest() == source["sha256"]


def test_duplicate_intake_returns_existing_source(client, source):
    """Same bytes → same source. History is never overwritten."""
    r = client.post(
        "/api/sources",
        files={"file": ("paper.md", SAMPLE_PAPER.encode("utf-8"), "text/markdown")},
    )
    assert r.status_code == 201
    assert r.json()["id"] == source["id"]
    assert len(client.get("/api/sources").json()) == 1


def test_every_object_has_uuid(source, statement):
    import uuid

    uuid.UUID(source["id"])
    uuid.UUID(statement["id"])


def test_pipeline_creates_only_candidates(client, source, mock_provider):
    """After a full successful pipeline run, NOTHING is admitted automatically."""
    job = run_job(client, source["id"])
    assert job["status"] == "SUCCEEDED"

    statements = client.get(f"/api/statements?source_id={source['id']}").json()
    questions = client.get(f"/api/questions?source_id={source['id']}").json()
    claims = client.get(f"/api/claims?source_id={source['id']}").json()

    assert len(statements) == 2  # the unanchored third statement was dropped
    assert len(questions) == 1
    assert len(claims) == 1
    for obj in statements + questions + claims:
        assert obj["canon_status"] == "CANDIDATE_DRAFT — NOT ADMITTED", obj

    # The Call 3 recommendation exists in the job receipt but granted nothing.
    detail = client.get(f"/api/jobs/{job['id']}").json()
    assert detail["receipt"]["call3_recommendation"] == "PROMOTE_TO_REVIEW"
    for obj in statements:
        assert obj["canon_status"] != "CANONICAL"


def test_extraction_anchors_verify_against_source(client, source, mock_provider):
    """Every extracted item points back to exact source text."""
    run_job(client, source["id"])
    statements = client.get(f"/api/statements?source_id={source['id']}").json()
    assert statements
    for st in statements:
        quote = st["source_anchor"]["exact_quote"]
        assert quote in SAMPLE_PAPER


def test_model_runs_recorded_with_prompt_versions(client, source, mock_provider):
    job = run_job(client, source["id"])
    runs = client.get(f"/api/jobs/{job['id']}/runs").json()
    assert len(runs) == 3
    assert all(r["succeeded"] for r in runs)
    assert [r["call_number"] for r in runs] == [1, 2, 3]


def test_failed_model_call_creates_receipt(client, source, mock_provider):
    mock_provider.fail_on = {1}
    job = run_job(client, source["id"])
    assert job["status"] == "FAILED"
    failures = client.get(f"/api/jobs/{job['id']}/failures").json()
    assert len(failures) == 1
    assert failures[0]["error_class"] == "HTTP_ERROR"
    # No partial candidates from a failed run
    assert client.get(f"/api/statements?source_id={source['id']}").json() == []


def test_reruns_do_not_overwrite_history(client, source, mock_provider):
    job1 = run_job(client, source["id"])
    statements_after_first = client.get(f"/api/statements?source_id={source['id']}").json()
    job2 = run_job(client, source["id"])
    statements_after_second = client.get(f"/api/statements?source_id={source['id']}").json()

    ids_first = {s["id"] for s in statements_after_first}
    ids_second = {s["id"] for s in statements_after_second}
    # Rerun appends: old candidates still present and untouched, new ones added.
    assert len(ids_first) == 2 and len(ids_second) == 4
    assert ids_first.issubset(ids_second)
    rerun_detail = {s["id"]: s for s in statements_after_second}
    for original in statements_after_first:
        assert rerun_detail[original["id"]]["version"] == original["version"] == 1
        assert rerun_detail[original["id"]]["canon_status"] == original["canon_status"]

    runs1 = client.get(f"/api/jobs/{job1['id']}/runs").json()
    runs2 = client.get(f"/api/jobs/{job2['id']}/runs").json()
    assert len(runs1) == 3 and len(runs2) == 3


def test_stale_job_can_be_deleted_without_deleting_source(client, source):
    """Cleanup removes only the job; preserved source material remains intact."""
    from app.db import session_scope
    from app.models.entities import ProcessingJob

    with session_scope() as db:
        job = ProcessingJob(source_id=source["id"], status="RUNNING", receipt={})
        db.add(job)
        db.commit()
        job_id = str(job.id)

    response = client.delete(f"/api/jobs/{job_id}")
    assert response.status_code == 204
    assert client.get(f"/api/jobs/{job_id}").status_code == 404
    assert client.get(f"/api/sources/{source['id']}/content").content == SAMPLE_PAPER.encode("utf-8")


def test_candidate_api_cannot_self_promote(client, statement):
    """Even if a client sends canon_status directly, the object stays a candidate."""
    r = client.post(
        "/api/statements",
        json={
            "exact_statement": "Attempted forced admission.",
            "statement_mode": "LOGICAL",
            "canon_status": "CANONICAL",  # must be ignored
        },
    )
    assert r.status_code == 201
    assert r.json()["canon_status"] == "CANDIDATE_DRAFT — NOT ADMITTED"

    # And the pipeline module has no import path to the ruling service:
    import ast

    import app.pipeline.three_call as tc

    tree = ast.parse(open(tc.__file__, encoding="utf-8").read())
    imported = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom) and node.module:
            imported.add(node.module)
        elif isinstance(node, ast.Import):
            for a in node.names:
                imported.add(a.name)
    assert not any("rulings" in m for m in imported), imported


def test_unlimited_true_statements(client, source):
    """No truth_statement_1/2/3 columns — statements are unlimited rows."""
    for i in range(150):
        r = client.post(
            "/api/statements",
            json={"exact_statement": f"Atomic statement number {i}.", "statement_mode": "CONJECTURE"},
        )
        assert r.status_code == 201
    all_statements = client.get("/api/statements?limit=500").json()
    assert len(all_statements) >= 150


def test_model_json_minor_syntax_damage_is_repaired():
    payload = extract_json_object(
        '```json\n{"questions": [{"exact_question": "Why?" "importance": "HIGH"}],}\n```'
    )

    assert payload["questions"][0] == {
        "exact_question": "Why?",
        "importance": "HIGH",
    }
