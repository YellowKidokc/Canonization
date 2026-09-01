# Theophysics Canonization

Single external application and shared schema home for candidate canonization. Semantic AI remains the Obsidian-facing selection/prompt client; the browser workbench provides visual review; both exchange `schemas/canonization-record.schema.json`. JSON is structured interchange. Markdown and HTML are projections. PostgreSQL is a future query/persistence layer, not canon authority.

Every generated record defaults to `CANDIDATE_DRAFT  NOT ADMITTED`. Candidate, Frozen, Reviewed, and Voted are not Admitted. Only a distinct governed admission event can support Admitted state.

Run `npm run verify`. No migration command is provided intentionally. The live Obsidian vault and all live databases are outside repository build/test scope.

The existing Semantic AI provider settings, prompt profiles, selection/context menus, progress/results, classification, graph/export, UUID, indexing, concept tracking, and error handling remain in `src`. Shared services now live in `src/engine`, `src/schema`, `src/reconciliation`, `src/governance`, `src/projections`, and `src/storage`. The governed UI is in `web`; preserved Nerve inputs are in `web/nerve-source`.
