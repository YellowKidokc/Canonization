# Complete round-trip test receipt

Automated fixture flow exercised:

`Fixture JSON/Markdown -> immutable discovery record -> permitted review merge -> schema validation -> deterministic Markdown regeneration -> versioned draft conflict`

Verified: stable record ID, source hash, immutable blind discovery, unknown extension preservation, deterministic Markdown for the same JSON, Candidate/Reviewed non-admission status, null admission event, preservation of objections/countermodels/open gaps, and optimistic conflict refusal when two writers share a base version.

Not yet runtime-verified: actual browser download followed by Obsidian file import. No active pointer implementation exists in this repository, so no pointer mutation occurred.
