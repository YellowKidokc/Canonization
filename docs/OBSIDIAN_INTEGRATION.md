# Obsidian integration

Retained capabilities include configured provider/model paths, prompt profiles, note/folder selection and context menus, progress/result interfaces, classification, graph registry/export, Markdown export, UUID generation, indexing, concept tracking, and existing error handling.

Added commands: Canonize this paper/folder, Run complete canonization, Run selected canonization stages, Open candidate in workbench, Export candidate JSON, Import reviewed JSON, and Refresh candidate Markdown from JSON.

This slice creates validated candidate envelopes and stage receipts. It does not yet translate every provider response into every governed field. The stage picker is driven by the shared governed-stage list. Runtime writes are limited to the vault-relative `Canonization` projection area. The packaged workbench is opened through Obsidian's vault resource-path API; a page-relative URL is not used.

`Open governed review registry` displays every governed object classification with its prompt, all independent axes, and all bridge questions from the same versioned registry used to generate the HTML workbench controls.
