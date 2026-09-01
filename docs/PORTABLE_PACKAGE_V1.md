# Portable Canonization Package v1.0.0

JSON in `records/` is authoritative; Markdown and HTML are disposable projections. A package has no admission authority. Its manifest therefore carries `PORTABLE_CANDIDATE_DATA_NOT_ADMISSION`, and an admitted record is refused at this interface even if copied into a canon-named folder.

The layout is `manifest.json`, `records/`, `projections/`, `sources/`, `relationships/`, `receipts/`, `schemas/`, `web-backup/`, and `PACKAGE_SHA256.csv`. Empty optional directories are logical layout entries; exporters populate them when the corresponding materials exist. The manifest pins package and record schema versions, stable IDs and optimistic record versions. The checksum CSV covers the manifest and every declared payload.

Export serializes objects with sorted keys, creates deterministic Markdown from JSON, includes browser state directly (never by scraping HTML), and emits an export receipt. Validation checks versions, every hash, record schemas, source hashes when source payloads are present, IDs, dependencies, and the no-admission boundary. Import uses optimistic versions, refuses stale/concurrent/source conflicts without overwriting, preserves unknown JSON fields, regenerates Markdown, and returns validation/import/regeneration receipts.

The TypeScript interface in `src/package/portable-package.ts` is storage-neutral: filesystem, Obsidian, and browser adapters must translate the returned file map to ZIP or directories without changing bytes. `exportPackage` supports a selection or all project records; `restoreWebBackup` restores structured browser state.
