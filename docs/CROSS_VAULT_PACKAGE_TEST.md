# Cross-vault installation and test

1. Create two new disposable vaults outside the live Axiom vault.
2. Run `npm ci && npm run build`; copy `main.js`, `manifest.json`, and `styles.css` into each disposable vault's `.obsidian/plugins/canonization/` directory.
3. Export selected records or the complete project through the portable package adapter. Do not use PostgreSQL or put credentials in vault/browser configuration.
4. Validate hashes and schemas, import the structured browser backup into the HTML workbench, edit review-owned fields, and export a new incremented package.
5. Validate and import into vault two. Confirm JSON first, then regenerate Markdown; compare package hashes and receipts. Never use the live Axiom vault.

Automated tests exercise the storage-neutral round trip. Actual Obsidian UI clicks require a local Obsidian runtime and must be recorded as manually verified only after performance.
