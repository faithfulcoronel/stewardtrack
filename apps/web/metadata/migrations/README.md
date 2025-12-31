# Metadata schema migrations

Store JSON-to-JSON migration scripts here. Each migration exports a named function that accepts a canonical page definition and returns the upgraded payload. The runtime applies migrations in `src/lib/metadata/migrations.ts` before resolving metadata.
