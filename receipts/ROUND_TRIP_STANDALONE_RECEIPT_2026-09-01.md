# Standalone round-trip receipt

Fixture: `dist/standalone-runtime-20260901T210023Z/vault-roundtrip`

Automated JSON round-trip tests preserve stable record ID, source hash, immutable blind discovery, classifications, tags/review data, unknown fields, receipts/provenance, candidate-only propagation, versions/conflict detection, and null admission reference. The workbench imports and exports governed JSON directly and never reconstructs authority from Markdown or HTML.

The browser export to Obsidian adapter is intentionally manual: export reviewed JSON in the workbench, place/select that file in the disposable vault, then run `Canonization: Import reviewed JSON`. Browser file-system sandboxing prevents a safe automatic write back into a vault. No live vault was accessed.
