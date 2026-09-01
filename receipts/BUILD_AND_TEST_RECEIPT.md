# Build and test receipt

Date: 2026-08-31. Branch: `feature/unified-canonization-engine`.

Passed: TypeScript typecheck; production Obsidian bundle build; 10 Node tests covering schema validation, candidate defaults, deterministic Markdown, unknown-field preservation, blind-discovery immutability, admission separation, cache recovery/conflicts, workbench actions, Nerve 7Q placeholder evidence, and migration boundary/transaction syntax.

Lint note: the inherited `src/epistemic/graph-exporter.ts` and `src/indexing/markdown-exporter.ts` produce 27 pre-existing `no-explicit-any`/escape errors and one warning. They remain typechecked and built but are explicitly excluded from ESLint pending a focused refactor. New and remaining retained TypeScript is linted. This exclusion is technical debt, not a claim that inherited lint is clean.

PostgreSQL syntax was statically checked for transactional structure and required separation; no PostgreSQL parser/server was available or contacted, and no migration was applied. Browser behavior was contract-tested from source but not manually exercised in a browser. The Obsidian plugin was built but not installed or run against the live vault.
