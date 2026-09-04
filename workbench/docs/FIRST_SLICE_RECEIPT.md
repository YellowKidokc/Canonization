# FIRST SLICE RECEIPT — Canonization Governed Workbench

Date: 2026-09-04
Branch: `feature/governed-workbench` (from checkpoint `e6cdd4a` on `checkpoint/pre-workbench-20260904`)
Status label: **CANDIDATE_DRAFT — NOT ADMITTED** (this receipt describes infrastructure, not canon)

## What was built
- `workbench/backend` — FastAPI + SQLAlchemy 2 + Alembic over embedded PostgreSQL 16.2 (pgserver).
- `workbench/frontend` — React 19 + TS + Vite + TanStack Query + shadcn/Radix + @xyflow/react.
- `workbench/tests` — 25-test pytest acceptance suite against genuine embedded PostgreSQL.
- Migration `0001_core`: 19 tables + canon_status_audit backstop + prediction immutability trigger + FTS search projection.

## Commands run (summary)
- `python -m venv backend/.venv` + pip install of backend requirements.
- `python -m alembic upgrade head` (embedded PostgreSQL 16.2).
- `uvicorn app.main:app --port 8471` + curl end-to-end smoke (intake → statement → 2-step promotion → audit → search → exports) — **passed after restart with search-sync fix**.
- `pytest tests -q` → **25 passed** (final run; provider mocked).
- `npm run build` in `workbench/frontend` → **passes** (tsc strict + vite; one benign chunk-size warning).
- `npm run test` (vitest smoke: login screen renders on 401) → **1 passed**.
- Plugin `npm run verify` → **passes** (workbench excluded from plugin tsconfig; plugin source untouched).

## Acceptance test evidence (all in tests/)
- Originals unchanged + SHA-256 verified on read: `test_intake_preserves_bytes_and_hash`
- UUIDs on every object: `test_every_object_has_uuid`
- Extraction anchors verified verbatim against source; unanchored items dropped: `test_extraction_anchors_verify_against_source`, `test_pipeline_creates_only_candidates`
- Unlimited true statements (150 inserted): `test_unlimited_true_statements`
- Failed model calls → failure receipts + FAILED job: `test_failed_model_call_creates_receipt`
- Reruns append history; originals untouched: `test_reruns_do_not_overwrite_history`
- Evidence/bearing separation: `test_evidence_bearing_lives_on_the_edge`
- fully_opened = epistemically exposed, not quality: `test_evidence_atom_nine_burdains_fully_opened_not_quality`, `test_evidence_not_fully_opened_when_burden_missing_or_rationale_required`
- Discovery Commons accepts unclassified objects: `test_unclassified_discovery_accepted`
- Prediction registration immutable (trigger + versioned corrections): `test_prediction_registration_is_immutable`
- Promotion → immutable ruling; demotion preserves history; canon reconstructable at any version: `test_promotion_creates_immutable_rulings`, `test_demotion_preserves_canonical_history`, `test_canon_version_reconstruction`
- Candidate APIs cannot self-promote (payload ignored; pipeline has no ruling import path — AST-verified): `test_candidate_api_cannot_self_promote`
- JSON export validates + retains UUIDs; Markdown labeled projection: `test_json_export_validates_and_retains_uuids`, `test_markdown_projection_is_labeled`
- Restart preserves state: `test_restart_preserves_state`
- Homepage search retrieves admitted object (text + UUID): `test_search_retrieves_admitted_object`, `test_search_by_uuid`

## Known gaps / not done in this slice
- No real DeepSeek run against a live paper in this receipt (key placeholder empty; pipeline verified with mocked provider; SSE + receipts verified end-to-end). Set `DEEPSEEK_API_KEY` in `workbench/.env` to enable live runs.
- Prediction tournaments, contradiction/entailment/ablation engines, Z3/Lean, ATOM packets, Excel: schema/vocab reserved, not built (Phases 3–5).
- Single-user local auth only.
- Dev database contains only the final live-verification demo (one source, one admitted statement, canon v2). Accidental test artifacts (C:/tmp import, proxy-verification rows) were removed. Exports from verification remain in `60_EXCHANGE` as format evidence.
- Frontend SSE "Run pipeline" click-through with a live job done at HTTP level; verify once with a real API key.
