# Provider mapping report

The new fixture provider mapping is deliberately candidate-only:

| Origin | Destination | Authority |
|---|---|---|
| Provider claim strings | `claims[]` | AI proposal |
| Provider objections | `strongestDefeaters[]` | AI proposal |
| Provider unknowns | `openGaps[]` | AI proposal |
| Provider summary | `summary` | AI proposal |
| Source bytes/hash and record UUID | `source.contentHash`, `recordId` | Deterministic extraction/client identity |
| Vault title/path/mtime | `source`, coordinates | Inherited metadata, after blind capture |
| Raw response/model/request ID | `provenance[]` | Preserved receipt, not normalized authority |
| Human review note | `reviewHistory[]` | Human review, explicitly not admission |

No provider field maps to workflow authority, admission references, active pointers, or canon status.
