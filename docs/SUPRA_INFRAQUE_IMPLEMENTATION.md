# Supra Infraque Implementation

The plugin now has a separate ontology/provenance graph beside the existing
semantic tag registry. The graph is stored in the plugin data directory as
`supra-infraque-graph.json`, so note edits and tag migrations cannot erase it.

## Current Vertical Slice

- Stable UUID object identities and readable candidate codes such as `CLM-001`.
- Candidate epistemic objects with type, canonical text, scope, modality,
  polarity, framework, status, author, timestamp, and version.
- Immutable artifact records with source path, byte count, modified time, and
  SHA-256 content identity.
- Exact source spans linked to object occurrences.
- Typed relation, multiaxial classification, and append-only change-event
  structures in the graph schema.
- Folder exports: `SUPRA_INFRAQUE_GRAPH.json` and
  `SUPRA_INFRAQUE_GRAPH.md`.
- Obsidian commands to register the current note as a proposed candidate and
  export the current folder graph.

Registration is intentionally proposal-level. It does not claim that the note
is one claim, does not adjudicate truth, and does not modify the source note.

## Next Graph Phases

The remaining work is deliberately separate: neutral question definitions and
inquiry runs; UI forms for object editing and typed relations; A0 disclosure
audit; bridge dossiers; evidence/formal/protocol records; validation gates;
append-only assessments and conflict adjudication. These should be added to the
graph registry rather than folded back into the filename or tag taxonomy.
