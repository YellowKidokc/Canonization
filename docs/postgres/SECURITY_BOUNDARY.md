# Security boundary

Browser and Obsidian clients receive no database credentials. They communicate only with an authenticated application service. AI/search uses the read-only `ai_candidate_records` view and a least-privilege role. Secrets belong in a secret manager or deployment environment, never JSON records, projections, logs, caches, or Git.
