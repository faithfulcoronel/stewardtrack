import { promises as fs } from 'fs';
import path from 'path';
import semver from 'semver';
import type { CanonicalDefinition, CanonicalLayer, ManifestEntry, ManifestFile } from './types';
import type { CompileTimeContext } from './types';

export class RegistryPublisher {
  constructor(private readonly context: CompileTimeContext) {}

  async loadManifest(): Promise<ManifestFile> {
    try {
      const raw = await fs.readFile(this.context.paths.manifestPath, 'utf-8');
      return JSON.parse(raw) as ManifestFile;
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        return { generatedAt: new Date().toISOString(), entries: {} };
      }
      throw error;
    }
  }

  async publish(definition: CanonicalDefinition, manifest: ManifestFile): Promise<void> {
    await this.writeCompiledArtifact(definition);
    await this.updateLatestPointer(definition);
    this.updateManifest(manifest, definition);
  }

  async persistManifest(manifest: ManifestFile): Promise<void> {
    const sortedEntries = Object.keys(manifest.entries)
      .sort()
      .reduce<Record<string, ManifestEntry>>((acc, key) => {
        acc[key] = manifest.entries[key];
        return acc;
      }, {});
    const payload: ManifestFile = {
      generatedAt: manifest.generatedAt,
      entries: sortedEntries,
    };
    await fs.mkdir(path.dirname(this.context.paths.manifestPath), { recursive: true });
    await fs.writeFile(this.context.paths.manifestPath, JSON.stringify(payload, null, 2) + '\n');
  }

  private async writeCompiledArtifact(definition: CanonicalDefinition): Promise<void> {
    const compiledPath = this.getCompiledPath(definition);
    await fs.mkdir(path.dirname(compiledPath), { recursive: true });
    await fs.writeFile(compiledPath, JSON.stringify(definition, null, 2) + '\n');
  }

  private async updateLatestPointer(definition: CanonicalDefinition): Promise<void> {
    const pointerPath = this.getLatestPointerPath(definition);
    await fs.mkdir(path.dirname(pointerPath), { recursive: true });
    let shouldWrite = true;
    try {
      const existingRaw = await fs.readFile(pointerPath, 'utf-8');
      const existing = JSON.parse(existingRaw) as ManifestEntry;
      if (existing && existing.contentVersion) {
        const cmp = compareContentVersions(definition.contentVersion, existing.contentVersion);
        shouldWrite = cmp >= 0;
      }
    } catch (error) {
      if (!isNodeError(error) || error.code !== 'ENOENT') {
        throw error;
      }
    }
    if (!shouldWrite) {
      return;
    }
    // Use forward slashes for cross-platform compatibility (Windows paths work with forward slashes)
    const compiledPath = path.relative(this.context.paths.rootDir, this.getCompiledPath(definition)).split(path.sep).join('/');
    const pointer: ManifestEntry = {
      key: computeManifestKey(definition.layer),
      kind: definition.kind,
      schemaVersion: definition.schemaVersion,
      contentVersion: definition.contentVersion,
      checksum: definition.checksum,
      layer: definition.layer,
      sourcePath: definition.sourcePath,
      compiledPath,
      featureCode: definition.featureCode,
      requiredPermissions: definition.requiredPermissions,
    };
    await fs.writeFile(pointerPath, JSON.stringify(pointer, null, 2) + '\n');
  }

  private updateManifest(manifest: ManifestFile, definition: CanonicalDefinition): void {
    const key = computeManifestKey(definition.layer);
    // Use forward slashes for cross-platform compatibility (Windows paths work with forward slashes)
    const compiledPath = path.relative(this.context.paths.rootDir, this.getCompiledPath(definition)).split(path.sep).join('/');
    const entry: ManifestEntry = {
      key,
      kind: definition.kind,
      schemaVersion: definition.schemaVersion,
      contentVersion: definition.contentVersion,
      checksum: definition.checksum,
      layer: definition.layer,
      sourcePath: definition.sourcePath,
      compiledPath,
      featureCode: definition.featureCode,
      requiredPermissions: definition.requiredPermissions,
      dependsOn:
        definition.kind === 'overlay'
          ? [computeManifestKey({ ...definition.layer, tenant: null, role: null, variant: null })]
          : undefined,
    };
    manifest.entries[key] = entry;
  }

  private getCompiledPath(definition: CanonicalDefinition): string {
    const compiledDir = this.context.paths.compiledDir;
    const segments = buildLayerSegments(definition.layer);
    const routeSegment = sanitizeSegment(definition.layer.route);
    return path.join(compiledDir, ...segments, `${routeSegment}@${definition.contentVersion}.json`);
  }

  private getLatestPointerPath(definition: CanonicalDefinition): string {
    const segments = buildLayerSegments(definition.layer);
    const routeSegment = sanitizeSegment(definition.layer.route);
    const dir = path.join(this.context.paths.latestDir, ...segments);
    return path.join(dir, `${routeSegment}.json`);
  }
}

function compareContentVersions(next: string, previous: string): number {
  const validNext = semver.valid(next);
  const validPrev = semver.valid(previous);
  if (validNext && validPrev) {
    return semver.compare(validNext, validPrev);
  }
  return next.localeCompare(previous);
}

function computeManifestKey(layer: CanonicalLayer): string {
  return [
    layer.tenant ?? 'global',
    layer.module,
    layer.route,
    layer.role ?? '-',
    layer.variant ?? '-',
    layer.locale ?? '-',
  ].join('::');
}

function buildLayerSegments(layer: CanonicalLayer): string[] {
  const segments = [sanitizeSegment(layer.tenant ?? 'global'), sanitizeSegment(layer.module)];
  if (layer.role) {
    segments.push('role', sanitizeSegment(layer.role));
  }
  if (layer.variant) {
    segments.push('variant', sanitizeSegment(layer.variant));
  }
  if (layer.locale) {
    segments.push('locale', sanitizeSegment(layer.locale));
  }
  return segments;
}

function sanitizeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9-_]/g, '-');
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
