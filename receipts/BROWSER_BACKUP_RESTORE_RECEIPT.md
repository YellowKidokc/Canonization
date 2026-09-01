# Browser backup/restore receipt

The automated test embeds structured draft state at `web-backup/browser-state.json`, verifies its package hash, and restores it by JSON parsing. No HTML scraping is used. IndexedDB/UI interaction remains manually unverified in this environment.
