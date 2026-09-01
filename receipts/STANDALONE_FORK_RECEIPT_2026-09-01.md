# Standalone fork receipt

- Starting commit: `37e64b0a7218d5372bf597424885cea9a055e500`
- Preservation branch: `archive/pre-standalone-canonization-20260901-155533` (pushed at the starting commit)
- Working branch: `feature/standalone-canonization-plugin`
- Plugin ID/name: `canonization` / `Canonization`
- Install path: `.obsidian/plugins/canonization`
- Settings ownership: Obsidian `loadData`/`saveData` scoped by the `canonization` manifest ID; no migration from Semantic AI exists.
- Runtime identity: Canonization-owned command IDs, view IDs, notices, registry paths, workbench resources, actors, and generated bundle.
- Authority boundary: every record remains `CANDIDATE_DRAFT  NOT ADMITTED`; JSON is authoritative and Markdown/HTML are projections.
- Verification: `npm ci`; `npm run verify` passed typecheck, lint, registry drift/completeness, 35 automated tests, and production build.
- Dependency audit: 12 advisories (2 moderate, 10 high); no automatic upgrades were applied.
- Installable ZIP: `dist/Canonization-standalone-2.0.0.zip`
- ZIP SHA-256: `e886b324e40f97436d0da59b56f59dc36f8001d31f5d1dfe7c74ffcc4723644c`

Historical internal TypeScript names `SemanticAISettings`, `SemanticTag`, `SemanticAISettingTab`, and `SemanticAIPlugin` remain intentionally for implementation continuity. Preserved migration receipts and `web/nerve-source` remain historical provenance. None is a runtime ID, path, storage key, or user-facing plugin identity.
