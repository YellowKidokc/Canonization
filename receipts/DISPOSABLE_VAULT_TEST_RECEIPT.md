# Disposable-vault test receipt

- Date: 2026-08-31
- Repository start: `feature/unified-canonization-engine` at `9e2e6137ce4038a805d4088daa5db9f6e5cee79c`
- Vault: `C:\Users\David\Documents\Codex\DisposableVaults\Canonization-Audit-20260831-210732`
- Isolated Electron profile: `C:\Users\David\AppData\Local\Temp\Canonization-Obsidian-20260831-210732`
- Fixtures: `Fixtures/Axiom Fixture.md` and `Fixtures/Second Fixture.md`
- Plugin bundle, manifest, stylesheet, and workbench were copied only into this disposable vault.
- No private `.obsidian` configuration or credentials were copied. No provider API was called.

Result: the production bundle was installed into the disposable vault, and an isolated Obsidian 1.13.7 process started and responded on its separate debugging port. Obsidian remained on its first-run vault chooser; therefore plugin activation, settings rendering, real context-menu clicks, and command execution are **not runtime-verified**. Static registration and bundle construction pass. This is a blocker to a controlled live-vault pilot.

No live vault or PostgreSQL database was accessed or mutated by this test.
