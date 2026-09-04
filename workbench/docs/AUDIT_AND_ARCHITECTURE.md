# Canonization — Audit and Architecture Map (2026-09-04)

## 1. Repository audit: what genuinely exists vs proposed

### Genuinely implemented and working (verified by receipts + tests)
- **Obsidian plugin** (`src/`, 42 TS files): classification tagging, concept registry
  (stable UUIDs per label), vault indexing, portable-package export/validate with
  SHA-256 receipts, candidate-record creation with `sha256:` source hash, Ajv
  validation against `schemas/canonization-record.schema.json`, web review
  workbench (`web/workbench.html`, IndexedDB drafts, candidate-only enforcement).
  `npm run verify` passed 31/31 tests at last receipt.
- **Governed record schema** (`schemas/canonization-record.schema.json`): enforces
  `statusLabel: "CANDIDATE_DRAFT  NOT ADMITTED"` and admission-event separation.
- **PostgreSQL schema** (`migrations/001_unified_canonization.up.sql`, 18 tables):
  complete but **never applied anywhere** (per `docs/postgres/POSTGRES_READINESS.md`).
- **ATOMS blind-discovery import** (`src/integration/atoms-receipt.ts` + uncommitted
  clients): hash/authority guards — refuses import unless
  `canonical_admission_performed === false && human_ruling_required === true`.
- **13 hand-written receipts** in `receipts/` recording prior verification work.

### Proposed/stubbed — not real
- **The 10-stage governed pipeline never executes provider calls.**
  `canonizeFile` (`src/obsidian/canonization-client.ts:14-22`) stamps a receipt
  claiming `executedStages` but runs no stages; the blind result is the placeholder
  `{objects: [], open: ["AI stage results pending or imported separately"]}`.
- **No dedicated question extractor in the plugin.** Extraction shells out to a
  Python script hardcoded to `D:\GitHub\Faith-through-physics-atoms\_final_api_calls\run_embedded_markdown.py`.
- **No durable failure receipts** for failed model calls (batch failures only
  surface in the progress UI).
- **Dead modules, unwired:** `contradictions/scanner.ts`, `reconciliation/compare.ts`,
  `governance/states.ts`, `storage/cache/cache.ts`, `storage/postgres/repository.ts`
  (interface only), `portable-package.ts#importPackage`.
- **No database, no server process anywhere in the repo.** Dependencies are
  `ajv`, `ajv-formats`, `uuid` only.
- Hardcoded machine paths (`D:\GitHub\Faith-through-physics-atoms`,
  `../02_CANONIZATION/Canonization`, `O:\Theophysics_Backend\...`) and plaintext
  API keys in plugin settings.

### Preserved (untouched by this work)
- `runtime-sync/` — snapshot of the live production Obsidian runtime.
- `web/nerve-source/` — byte-preserved Nerve originals.
- `receipts/`, `docs/migration/` receipts, `docs/examples/`,
  `docs/templates/CLAIM_ATOM_EXPANSION_AI_INTAKE_TEMPLATE_v1_1.md`.
- In-progress plugin work committed to `checkpoint/pre-workbench-2026094`…
  (branch `checkpoint/pre-workbench-20260904`, commit `e6cdd4a`).

### Environment findings
- Python 3.12.10, Node 24.19. No PostgreSQL installed, no Docker → embedded
  genuine PostgreSQL 16.2 via `pgserver`.
- External spec repo `D:\GitHub\Faith-through-physics-atoms\_final_api_calls\`
  exists (three-call pipeline spec, question-extractor canon, claim-atom canon v1.1) —
  used as prompt-source reference for the new pipeline.

## 2. New architecture (this workbench)

```
React SPA (Vite, TS, TanStack Query, shadcn/Radix, @xyflow/react)
   →  FastAPI (session-cookie auth, single user; secrets server-side in .env)
      →  services/rulings.py   ← sole canon_status mutation path (append-only Rulings)
      →  services/sources.py   ← write-once content-addressed preserved bytes
      →  pipeline/three_call.py ← DeepSeek calls; NEVER imports rulings
      →  PostgreSQL 16.2 (embedded pgserver; swap = DATABASE_URL_OVERRIDE only)
```

**Authority rules enforced in code**
1. All object tables carry `canon_status` CHECK-constrained to the governed
   vocabulary, default `CANDIDATE_DRAFT — NOT ADMITTED`.
2. `services/rulings.py` is the only mutation path; routers are its only callers;
   the pipeline cannot self-promote (verified by AST test).
3. Every ruling = append-only `rulings` row + status change + `canon_versions`
   bump in one transaction. Demotion preserves history; `GET /api/canon/at/{v}`
   reconstructs any prior canon.
4. Predictions: `registered_at` immutable (DB trigger); corrections create new
   version rows.
5. Evidence: bearing lives on typed `evidence_edges`, never on the evidence atom;
   `fully_opened` = all nine burdens addressed or explicitly marked with
   rationale — an epistemic-exposure flag, not a quality score.
6. Source bytes preserved content-addressed; SHA-256 verified on every read;
   originals never modified; duplicate intake returns the existing source.
7. Failed model calls always write `failure_receipts`; reruns append new jobs/runs.

## 3. Status of the build-brief object model

Implemented in slice 1: SOURCE, SOURCE_VERSION, PROCESSING_JOB, MODEL_RUN,
PROMPT_VERSION, FAILURE_RECEIPT, QUESTION, CLAIM, TRUE_STATEMENT (unlimited rows),
EVIDENCE (nine burdens), EVIDENCE_EDGE (typed bearing), DISCOVERY_COMMONS,
PREDICTION (immutable registration + versions), RULING, CANON_VERSION,
EXPORT_RECEIPT. Schema fields reserved for later phases: constraint_status on
statements (truth engine), answer mapping, contradictions/UNSAT cores,
formalization receipts (Lean/Z3), independence clusters, prediction tournaments.

## 4. Exchange boundary

- JSON export → `C:\Users\David\Documents\faiththruphysics.com\60_EXCHANGE`
  (authoritative serialization; retains UUIDs; sha256 receipt row).
- Markdown projection → same directory, header-labeled `PROJECTION — NOT AUTHORITATIVE`.
- The Obsidian plugin remains an optional client; it never receives DB access.

## 5. Verification

- 25 pytest acceptance tests, all passing (embedded genuine PostgreSQL, provider mocked):
  intake preservation, hash integrity, candidate-only pipeline, anchor verification,
  failure receipts, rerun history, ruling governance, canon reconstruction,
  prediction immutability, evidence/edge separation, fully_opened semantics,
  discovery commons, export validation, restart persistence, search retrieval.
- Plugin untouched; `npm run verify` remains the plugin's own gate.
