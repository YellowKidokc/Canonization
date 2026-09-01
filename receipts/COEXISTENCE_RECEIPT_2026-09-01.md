# Coexistence receipt

Fixture: `dist/standalone-runtime-20260901T210023Z/vault-coexistence`

- Both `.obsidian/plugins/semantic-ai` and `.obsidian/plugins/canonization` exist.
- `community-plugins.json` lists both IDs.
- Manifest IDs, names, install directories, settings files, command IDs, and view IDs are distinct.
- Canonization resolves `web/workbench.html` from its own `manifest.dir`.
- The Semantic AI sentinel `data.json` SHA-256 remained `a385b7921017e4a87db890e03456967baf51fb2ee25b8be40c49d0e52e5791e2`; Canonization source has no Semantic AI data path or migration reader.
- Static coexistence tests passed. Obsidian desktop was not available from the shell, so enable/disable behavior was not interactively exercised and is not claimed as desktop-verified.
