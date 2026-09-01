# Nerve control crosswalk

Inventory covers the six preserved source pages. Counts are evidence, not a contract: Atom Builder 16 buttons/42 inputs/1 select/17 textareas; Capsule 3/3/1/4; Reconciliation 7/5/1/2; Review 3/1/0/0; Workbench 16/12/3/7; 7Q is a 44-byte unresolved placeholder.

| Page/control family | Ruling | Unified implementation |
|---|---|---|
| Atom Builder typed candidate fields, provenance, objections, gaps, export | Partially represented | Governed arrays, raw provider provenance, workbench review/export; full per-atom editor intentionally not ported |
| Atom Builder admission checks | Already represented | Workbench and Obsidian refuse Admitted records and non-null admission references |
| Capsule compact intake | Obsolete for round trip | Governed JSON import is the single intake contract |
| Reconciliation compare, conflict, minority/open fields | Partially represented | Classification comparison and draft version conflict exist; rich reconciliation form remains a gap |
| Review validation/status display | Already represented | Seven visible states, schema validation, protected-field checks |
| Preserved Workbench staged preview/queue/download | Partially represented | Governed stage preview, candidate execution receipts, IndexedDB draft/export |
| Local admission/approval controls in preserved pages | Unsafe | Not ported; admission requires a separate authenticated governed event |
| Direct database controls/credentials | Unsafe | Must not be exposed to Obsidian or browser code |
| `7q-engine.html` | Unresolved | Preserved unchanged; wrapper says contract pending |

Smallest controls added in this audit: actual note/folder candidate actions, governed stage selection/preview/dependency warnings, execution receipts, provider provenance separation, review-note append, seven-state display, and versioned IndexedDB conflict handling.
