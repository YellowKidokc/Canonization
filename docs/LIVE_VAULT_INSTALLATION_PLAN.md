# Exact controlled live-vault installation plan

Do not execute this plan until the remaining blockers are closed and a human explicitly authorizes the pilot.

1. Freeze and hash the reviewed feature commit and production bundle.
2. Re-run typecheck, lint, tests, build, secret scan, and disposable Obsidian/browser round trip.
3. Remove Obsidian-side PostgreSQL connection strings and require a service-owned authenticated boundary; keep sync disabled.
4. Back up only the target vault's plugin state and confirm no conflicting plugin ID.
5. Copy `manifest.json`, `main.js`, and `styles.css` to `01_WORKING/.obsidian/plugins/canonization/` during an approved maintenance window.
6. Enable the plugin with fake/offline provider settings, run one designated fixture note, and inspect generated JSON/Markdown hashes and provenance.
7. Exercise export/edit/reimport once, confirm zero admission events and no source-note mutation, then record a pilot receipt.
8. Stop and roll back the plugin directory on any protected-field, conflict, credential, or authority-boundary failure.

No PostgreSQL migration belongs to this pilot.
