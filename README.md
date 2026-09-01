# Canonization

Canonization is an independent Obsidian plugin installed at `.obsidian/plugins/canonization`. It inherited useful classification, provider, prompt, graph, and indexing implementation from Semantic AI, but has its own manifest identity, commands, views, settings file, registries, packaged workbench, receipts, and generated artifacts. Semantic AI is neither required nor called. Canonization never reads or migrates `.obsidian/plugins/semantic-ai/data.json` or provider credentials.

The visible workflow is: (1) immutable neutral discovery from source content, preserving identity, hash, exact wording, unknowns, and provenance; (2) governed classification/tagging proposals with custom prompts kept separate; (3) authoritative candidate JSON; (4) HTML workbench review of that same JSON; and (5) manual browser export plus Obsidian file selection/import. Browser sandboxing means the user must select the exported JSON file manually. Markdown and HTML are projections; JSON remains authoritative.

Every generated record defaults to `CANDIDATE_DRAFT  NOT ADMITTED`. Candidate, Frozen, Reviewed, and Voted are not Admitted. Only a distinct governed admission event can support Admitted state.

Install dependencies with `npm ci`, then run `npm run verify` and `npm run runtime:fixtures`. Copy `manifest.json`, `main.js`, `styles.css`, and `web/` into `.obsidian/plugins/canonization`. No Semantic AI migration command exists intentionally. Live vaults and databases are outside repository build/test scope.

Provider settings, prompt profiles, selection/context menus, progress/results, classification, graph/export, UUID, indexing, concept tracking, and error handling are Canonization-owned code in `src`. Historical TypeScript symbols such as `SemanticAISettings`, `SemanticTag`, and `SemanticAISettingTab` are intentionally retained internal implementation names for source continuity; they are not IDs, paths, storage keys, notices, or user-facing identity. Preserved Nerve source inputs in `web/nerve-source` are provenance artifacts, not runtime authority.
