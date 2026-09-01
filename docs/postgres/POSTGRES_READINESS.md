# PostgreSQL readiness

Migration `001` prepares candidate records, append-only versions, typed objects/edges, reviews, votes, separately governed admission events, projections, drafts, and idempotent synchronization receipts. It has not been applied to any database. Review extension policy, roles, row-level security, retention, and backup/restore before applying. Rollback SQL is provided, but dropping populated tables is destructive and requires a separately approved maintenance window.
