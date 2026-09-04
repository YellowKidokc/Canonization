# Canonization Integration Receipt

**Date:** 2026-09-04  
**Integrated branch:** `feature/integrated-canonization-20260904`  
**Base:** `feature/governed-workbench` at `42b6535`

## Reconciliation ruling

`feature/unified-canonization-engine` is an ancestor of
`feature/governed-workbench`. The branch comparison was `0 16`: the unified
branch had no exclusive commits, while the governed branch had sixteen later
commits. No content merge or conflict resolution was required.

The existing running worktree was left untouched. Its apparent changes were
untracked runtime material only: the Python virtual environment and generated
test artifacts. No unique source edits were found outside those ignored paths.

## Verification

- Root plugin verification: **56/56 tests passed**, including typecheck, lint,
  registry generation, and production build.
- Governed FastAPI workbench: **27/27 tests passed**.
- React workbench: production TypeScript/Vite build passed; **1/1 UI smoke test
  passed**.
- ATOM prompt rail is included in the root verification suite.

## Preserved authority boundary

- Generated records remain `CANDIDATE_DRAFT - NOT ADMITTED`.
- Pipeline output cannot grant canon status.
- Rulings remain the sole admission authority.
- JSON remains authoritative; Markdown and HTML remain projections.

## Non-blocking observations

- The frontend production bundle reports a size warning for its main JavaScript
  chunk. This is a performance optimization opportunity, not a correctness
  failure.
- Backend tests report dependency deprecation warnings from Alembic,
  Starlette/httpx, and AnyIO. They do not affect the passing test result.
