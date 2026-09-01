# Portable package remaining gaps

- The core returns a deterministic file map; ZIP and Obsidian command/UI adapters remain to be wired.
- Actual Obsidian source → HTML UI → second Obsidian vault operation requires desktop runtimes and remains manually unverified.
- Browser IndexedDB restore UI is not yet connected to `restoreWebBackup`; the structured backup contract is tested.
- Semantic/AI contradiction proposals and formal solver integration are not implemented. The deterministic scanner deliberately has a narrow candidate aperture and human-only finalization.
- A separately authorized admission-event importer is intentionally absent; this candidate portability interface refuses admitted records.
- No Canonization Git remote was configured in the supplied checkout at task start, so remote publication depends on repository credentials/configuration outside the implementation.
