"""Test harness: isolated embedded PostgreSQL + FastAPI TestClient.

Environment must be set BEFORE any app import (settings are cached).
SQLite is never used — every test runs against genuine PostgreSQL.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))

_TMP = Path(__file__).resolve().parent / "_tmp"
_TMP.mkdir(exist_ok=True)

os.environ["PG_DATA_DIR"] = str(_TMP / "pgdata")
os.environ["PG_DATABASE"] = "canonization_test"
os.environ["CANONIZATION_PASSWORD"] = "test-password"
os.environ["SESSION_SECRET"] = "test-secret"
os.environ["EXCHANGE_DIR"] = str(_TMP / "exchange")
os.environ["PRESERVED_DIR"] = str(_TMP / "preserved")
os.environ.pop("DATABASE_URL_OVERRIDE", None)


@pytest.fixture(scope="session")
def db_ready():
    """Boot embedded Postgres and apply migrations once for the whole session."""
    from alembic import command
    from alembic.config import Config

    from app.db import start_embedded_postgres

    start_embedded_postgres()
    cfg = Config(str(BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND / "alembic"))
    command.upgrade(cfg, "head")
    return True


@pytest.fixture(autouse=True)
def clean_db(db_ready):
    """Hermetic tests: truncate all governed tables before each test."""
    from sqlalchemy import text

    from app.db import get_engine

    tables = [
        "search_documents", "failure_receipts", "model_runs", "processing_jobs",
        "prompt_versions", "evidence_edges", "evidence", "questions", "claims",
        "true_statements", "discovery_commons", "predictions", "rulings",
        "canon_versions", "export_receipts", "source_versions", "sources",
        "canon_status_audit",
    ]
    with get_engine().begin() as conn:
        conn.execute(text("TRUNCATE " + ", ".join(tables) + " RESTART IDENTITY CASCADE"))
    yield


@pytest.fixture()
def client(db_ready):
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as c:
        r = c.post("/api/login", json={"password": "test-password"})
        assert r.status_code == 200, r.text
        yield c


SAMPLE_PAPER = """# The Intelligibility of Nature

The universe exhibits lawlike regularity describable by mathematics.
This regularity raises the question: what grounds the lawfulness of nature?

## The Argument

Contingent regularity demands an explanation beyond the regularities themselves.
One may object that necessity internal to physical law suffices.
But physical laws describe; they do not ground.
"""


@pytest.fixture()
def source(client):
    r = client.post(
        "/api/sources",
        files={"file": ("paper.md", SAMPLE_PAPER.encode("utf-8"), "text/markdown")},
    )
    assert r.status_code == 201, r.text
    return r.json()


@pytest.fixture()
def statement(client, source):
    r = client.post(
        "/api/statements",
        json={
            "exact_statement": "The universe exhibits lawlike regularity.",
            "statement_mode": "EMPIRICAL",
            "source_id": source["id"],
        },
    )
    assert r.status_code == 201, r.text
    return r.json()


# --- Mock three-call provider ----------------------------------------------
MOCK_CALL1 = {
    "questions": [
        {
            "exact_question": "What grounds the lawfulness of nature?",
            "question_type": "PHILOSOPHICAL",
            "anchor_quote": "what grounds the lawfulness of nature?",
            "start_line": 4,
            "end_line": 4,
            "why_pressure": "The text explicitly asks it",
            "importance": "HIGH",
        }
    ],
    "claims": [
        {
            "exact_claim": "Contingent regularity demands an explanation beyond the regularities themselves.",
            "plain_language": "Regularity needs a ground",
            "claim_mode": "PHILOSOPHICAL",
            "anchor_quote": "Contingent regularity demands an explanation beyond the regularities themselves.",
            "start_line": 7,
            "end_line": 7,
        }
    ],
    "definitions": [],
    "true_statements": [
        {
            "exact_statement": "The universe exhibits lawlike regularity describable by mathematics.",
            "plain_meaning": "Nature is mathematically lawful",
            "statement_mode": "EMPIRICAL",
            "scope": "observed physical reality",
            "assumptions": ["our mathematical descriptions apply"],
            "anchor_quote": "The universe exhibits lawlike regularity describable by mathematics.",
            "start_line": 3,
            "end_line": 3,
        },
        {
            "exact_statement": "Physical laws describe; they do not ground.",
            "plain_meaning": "Laws are descriptive not explanatory",
            "statement_mode": "PHILOSOPHICAL",
            "scope": "metaphysical",
            "assumptions": [],
            "anchor_quote": "But physical laws describe; they do not ground.",
            "start_line": 10,
            "end_line": 10,
        },
        {
            "exact_statement": "This statement has no real anchor in the text at all.",
            "plain_meaning": "should be dropped",
            "statement_mode": "CONJECTURE",
            "scope": None,
            "assumptions": [],
            "anchor_quote": "zzz nonexistent quote zzz",
            "start_line": 1,
            "end_line": 1,
        },
    ],
    "equations": [],
    "derivations": [],
    "evidence_references": [],
    "assumptions": [],
    "objections": [],
    "boundaries": [],
}

MOCK_CALL2 = {"evaluations": [{"item_index": 0, "item_kind": "true_statement"}], "cross_cutting_findings": []}
MOCK_CALL3 = {
    "what_survives": [],
    "what_fails": [],
    "what_is_conditional": [],
    "what_remains_unresolved": [],
    "strongest_objection": {"objection": "x", "against": "y", "anchor_quote": "But physical laws describe; they do not ground."},
    "countermodels": [],
    "premise_ablations": [],
    "rival_explanations": [],
    "final_ratings": {"overall_strength": 7, "mode_aware_notes": "test"},
    "recommended_human_ruling": "PROMOTE_TO_REVIEW",
    "recommendation_reason": "test recommendation — NOT an admission",
}


class MockProvider:
    """Returns canned JSON per call; can be told to fail."""

    def __init__(self, fail_on: set[int] | None = None):
        self.fail_on = fail_on or set()
        self.calls: list[str] = []

    def __call__(self, prompt: str):
        from app.pipeline.provider import ProviderResult

        call_no = 1 if '"questions"' in prompt else (2 if "evaluations" in prompt else 3)
        if "CALL 1 EXTRACTION" in prompt and call_no == 1:
            call_no = 2
        self.calls.append(prompt)
        if call_no in self.fail_on:
            from app.pipeline.provider import HttpError

            raise HttpError(f"mock failure on call {call_no}")
        import json as _json

        body = {1: MOCK_CALL1, 2: MOCK_CALL2, 3: MOCK_CALL3}[call_no]
        return ProviderResult(
            text=_json.dumps(body),
            model="mock-deepseek",
            tokens_used=100,
            latency_ms=5,
        )


@pytest.fixture()
def mock_provider(monkeypatch):
    mock = MockProvider()
    monkeypatch.setattr("app.pipeline.three_call.call_deepseek", mock)
    return mock


def run_job(client, source_id) -> dict:
    r = client.post(f"/api/jobs?source_id={source_id}")
    assert r.status_code == 201, r.text
    job_id = r.json()["id"]
    import time

    for _ in range(200):
        j = client.get(f"/api/jobs/{job_id}").json()
        if j["status"] in ("SUCCEEDED", "FAILED"):
            return j
        time.sleep(0.05)
    raise TimeoutError("job did not finish")
