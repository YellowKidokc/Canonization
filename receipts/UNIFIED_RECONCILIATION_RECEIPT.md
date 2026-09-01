# Unified Reconciliation Receipt

- Branch: `feature/unified-canonization-engine`
- Portable-package base: `b854d7f88a4d8014f3e1dd04823e6cd796d7ebff`
- Verification date: `2026-09-01`
- Environment: local Windows checkout with locked dependencies installed

## Reconciled slices

- Versioned portable candidate packages and deterministic package validation
- Candidate contradiction scanning and human adjudication boundary
- Five-panel governed browser review flow and faceted record browser
- Candidate-only propagation dispositions and canonical-propagation refusal

## Verification

`npm.cmd run verify` passed:

- TypeScript typecheck
- ESLint
- 28 automated tests
- Production Obsidian bundle build

The first integrated run exposed a negation-normalization defect for statements such as
`Y does not exist`. The normalizer was corrected, an explicit regression test was added,
and the complete verification command then passed.

## Authority and runtime boundaries

- Import, folder placement, review, and propagation proposals do not grant admission.
- Generated and transported records remain candidate data.
- No live vault or PostgreSQL database was accessed or changed during reconciliation.
- Desktop Obsidian and browser file-picker round trips were not manually exercised by this receipt.
