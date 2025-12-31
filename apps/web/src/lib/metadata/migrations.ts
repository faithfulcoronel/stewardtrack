import semver from 'semver';
import type { CanonicalPageDefinition } from './generated/canonical';

export const LATEST_SCHEMA_VERSION = '1.0.0';

type Migration = {
  from: string;
  to: string;
  migrate: (definition: CanonicalPageDefinition) => CanonicalPageDefinition;
};

// Register schema migrations here when introducing new schema versions.
const MIGRATIONS: Migration[] = [];

export function migrateToLatest(definition: CanonicalPageDefinition): CanonicalPageDefinition {
  let current = definition;
  const visited = new Set<string>();

  while (semver.lt(current.schemaVersion, LATEST_SCHEMA_VERSION)) {
    if (visited.has(current.schemaVersion)) {
      throw new Error(`Detected migration loop for schema version ${current.schemaVersion}`);
    }
    visited.add(current.schemaVersion);
    const migration = MIGRATIONS.find((item) => item.from === current.schemaVersion);
    if (!migration) {
      throw new Error(
        `No migration registered from schema ${current.schemaVersion} to reach ${LATEST_SCHEMA_VERSION}.`
      );
    }
    current = migration.migrate({ ...current, schemaVersion: migration.to });
  }

  if (semver.gt(current.schemaVersion, LATEST_SCHEMA_VERSION)) {
    throw new Error(
      `Loaded schema version ${current.schemaVersion} is newer than supported ${LATEST_SCHEMA_VERSION}.`
    );
  }

  return current;
}
