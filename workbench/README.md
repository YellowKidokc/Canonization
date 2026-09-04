# Canonization Workbench

Governed knowledge workbench: **React frontend → FastAPI backend → embedded PostgreSQL**.
This is the primary governed application; the Obsidian plugin (`../..`) is an optional
client/projection surface.

**Governing principle:** every generated or extracted object begins as
`CANDIDATE_DRAFT — NOT ADMITTED`. Only an authenticated human ruling can promote,
demote, defer, reject, or supersede. Rulings are append-only; the canon can be
reconstructed at any prior version.

## Layout

- `backend/` — FastAPI app (authoritative API; holds all secrets server-side)
- `frontend/` — React 19 + TypeScript + Vite SPA
- `tests/` — pytest acceptance suite (runs against genuine embedded PostgreSQL)
- `docs/` — audit + architecture map + first-slice receipt
- `backend/scripts/` — `dev.bat` (start API), `backup.ps1`, `restore.ps1`

## Quick start (Windows)

```bat
copy .env.example .env   REM then edit: set CANONIZATION_PASSWORD and DEEPSEEK_API_KEY
backend\scripts\dev.bat  REM starts API on http://127.0.0.1:8471 (boots embedded PostgreSQL on first run)
cd frontend && npm install && npm run dev   REM http://localhost:5173, /api proxied to the backend
```

Database files live in `%LOCALAPPDATA%\Theophysics\Canonization\postgres-data`
(never in the repo, never on a mapped drive). PostgreSQL **16.2** (bundled by pgserver).
To use a real PostgreSQL/pgvector server instead, set `DATABASE_URL_OVERRIDE` in `.env` —
no application changes needed.

## Operations

- Backup: `powershell backend\scripts\backup.ps1` → dump in `%LOCALAPPDATA%\Theophysics\Canonization\backups\`
- Restore: `powershell backend\scripts\restore.ps1 <dump>` (destructive)
- Tests: `cd workbench && PYTHONPATH=backend backend\.venv\Scripts\python -m pytest tests -q`
- Migrations: `cd backend && .venv\Scripts\python -m alembic upgrade head`

## Data flow

Intake (file/folder) → preserved bytes + SHA-256 (`CANDIDATE` by construction) →
processing job → three-call AI pipeline (lossless extraction → rigorous evaluation →
adversarial synthesis) → candidate objects anchored to source text → human review →
immutable rulings → versioned canon → JSON/Markdown projections into `60_EXCHANGE`.

JSON export is the authoritative exchange format. Markdown is a labeled projection.
See `docs/AUDIT_AND_ARCHITECTURE.md` for the full map.
