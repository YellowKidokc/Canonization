# Obsidian integration

Retained capabilities include configured provider/model paths, prompt profiles, note/folder selection and context menus, progress/result interfaces, classification, graph registry/export, Markdown export, UUID generation, indexing, concept tracking, and existing error handling.

Added commands: Canonize this paper/folder, Run complete canonization, Run selected canonization stages, Open candidate in workbench, Export candidate JSON, Import reviewed JSON, and Refresh candidate Markdown from JSON.

This slice creates validated candidate envelopes and stage receipts. It does not yet translate every provider response into every governed field or provide a stage-picker modal. Runtime writes are limited to the vault-relative `Canonization` projection area; this migration did not run the plugin or touch the live vault.
