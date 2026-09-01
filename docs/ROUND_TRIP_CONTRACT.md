# Round-trip contract

1. Semantic AI produces candidate JSON and Markdown projection.
2. Workbench imports JSON, validates authority fields, and preserves the entire object including unknown fields.
3. Only review-owned fields are edited. Protected blind discovery, record identity, schema version, candidate label, and admission reference are locked.
4. Local Save is a recoverable draft, not a governed export.
5. Export produces reviewed JSON directly; HTML is never scraped.
6. Obsidian validates imported JSON, refuses admission-bearing review packets, writes the governed record, and regenerates Markdown.

Conflict keys are stable record ID, base/source hash, record version, and synchronization timestamp. A stale expected version fails instead of overwriting.
