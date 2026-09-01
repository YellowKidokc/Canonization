# Field crosswalk

| Concern | Semantic AI | Governed JSON | Markdown | HTML | Cache | PostgreSQL |
|---|---|---|---|---|---|---|
| Identity/version | UUID client | `recordId`, `schemaVersion` | frontmatter | full record | stable key/version | records/versions |
| Source/provenance | selected note/folder | `source`, provenance/hashes | links/hash | read-only | base hash | source artifacts |
| Blind result | discovery stage | protected result | summary | immutable | preserved | JSON/version |
| Objects/types | classifier/graph | typed arrays | sections | full JSON | record | object/type tables |
| Classification | profiles/results | blind/inherited/comparison | section | full JSON | record | classifications |
| Reconciliation | stage output | proposal/lost structure | gaps | review | record | JSON/version |
| Claims/evidence/proofs | category routines | separate arrays | sections | full JSON | record | separate tables |
| Bridges | bridge profile | no-proof flag | explicit | detail | record | checked bridges |
| Defeaters/gaps | review profiles | typed arrays | sections | full JSON | record | JSON/objects |
| Lean | formalization profile | source/receipts | provenance | full JSON | record | Lean receipts |
| Review/votes | import workflow | histories/reports | status | editable review fields | draft | review/vote tables |
| Admission | none | separate reference | warning | blocked | blocked | separate event table |
| Projection/sync | export commands | metadata | sync/links | save/export | timestamps/hash | receipts |

Provider-response-to-field mapping and full per-field form controls remain a next slice; unknown fields already round-trip intact.
