# Architecture

Semantic AI reads selected notes/folders and performs configured candidate stages. `CanonizationClient` emits governed JSON plus readable Markdown under a vault-relative `Canonization` folder at runtime. The external workbench imports the same JSON, preserves unknown fields, locks protected discovery and authority fields, autosaves a recoverable browser draft, and exports reviewed JSON. Obsidian validates that JSON before regenerating Markdown.

The current cache abstraction has a tested in-memory implementation and the browser uses versioned localStorage drafts. IndexedDB is the recommended next browser implementation. PostgreSQL is represented only by a repository interface and unapplied SQL.

Blind discovery receives source content/hash coordinates only; inherited classification is later. Bridges explicitly carry `proofPropagation: false`. Application display, projection, cache, AI output, or database presence grants no canon authority.

`src/governance/review-registry.ts` is the versioned authority for governed object-type prompts, classification axes, bridge questions, and propagation dispositions. Obsidian consumes it directly. `npm run build:registry` generates `web/review-registry.generated.js` for the HTML workbench, and the test suite rejects drift between the two interfaces. The generated browser file is a projection, not a second registry.
