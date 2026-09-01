# Browser/workbench test receipt

The workbench now exposes all seven governance states while rendering `Admitted` as unavailable and governed-event-only. Imports reject wrong schema version, invalid record/hash structure, mutable blind discovery, Admitted state, and non-null admission references. Permitted edits replace only candidate/review fields; protected discovery is restored from the governed base. Unknown fields remain on the cloned record.

Draft storage uses IndexedDB with stable record IDs, monotonically increasing versions, base source hashes, recovery, export, explicit reset, and optimistic conflict detection. Drafts are labelled non-authoritative. Database synchronization is absent from the page.

Automated source-contract tests pass. A manual browser file-picker/export exercise remains unverified and is a blocker.
