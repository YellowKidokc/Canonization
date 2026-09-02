# Canonization runtime sync — 2026-09-02

This folder is an exact, reviewable snapshot of the live Production Obsidian runtime changes. It is intentionally separate from the repository's Semantic AI TypeScript source because the installed `canonization-workbench` runtime is not represented by a matching editable source module in this repository.

## Included runtime artifacts

- `canonization-workbench/main.js` — BFP-DG v2.1 discovery flow; paper-named run folders; Markdown-only Obsidian receipts; external authoritative JSON in `60_EXCHANGE/CANDIDATE_JSON`; direct parsed-response fallback when Semantic AI conversion returns zero tags.
- `semantic-ai/main.js` — exposes the already-parsed provider response to the Workbench fallback.
- `templates/DEEPSEEK_DISCOVERY_GRAMMAR_TO_ATOM_BUILDER_TEMPLATE_v2.1.md` — candidate-only BFP-DG v2.1 master template.

## Authority boundary

Every generated object remains `CANDIDATE_DRAFT — NOT ADMITTED`. JSON is the external exchange/import artifact; Markdown is a human-readable projection. This sync does not grant admission, alter a source paper, or include credentials.

## Review request

Before folding any snapshot changes into TypeScript source, identify or create the correct source module and add tests. Do not treat the copied runtime bundle as the preferred long-term source of truth.
