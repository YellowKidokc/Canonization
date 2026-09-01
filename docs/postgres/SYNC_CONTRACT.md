# Synchronization contract

The direction is Obsidian/Canonization → governed JSON → application/cache → authenticated service → PostgreSQL. Clients send schema version, stable record ID, expected base hash, content hash, and an idempotent synchronization key. The service validates JSON and conflicts before appending a version. Candidate writes cannot create `admission_events`; admission uses a separate authenticated governance endpoint and event.
