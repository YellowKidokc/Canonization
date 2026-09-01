# IndexedDB status

Implemented in the browser workbench because the existing cache contract already defines stable IDs, base hashes, versions, load/save/remove/export, and conflict errors. The implementation stores versioned non-authoritative drafts, recovers by record ID, rejects stale writes, detects source/base divergence, exports governed candidate JSON, and resets explicitly. It cannot set Admitted or an admission event.

Automated contract checks pass. Manual refresh/recovery in a real browser remains unverified.
