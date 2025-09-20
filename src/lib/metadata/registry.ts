import { promises as fs } from 'fs';
import path from 'path';
import Ajv from 'ajv';
import { cache } from 'react';
import type { CanonicalPageDefinition, CanonicalLayer } from './generated/canonical';
import { migrateToLatest } from './migrations';

const ROOT = process.cwd();
const SCHEMA_PATH = path.join(ROOT, 'metadata', 'schema', 'canonical.schema.json');
const REGISTRY_LATEST_DIR = path.join(ROOT, 'metadata', 'registry', 'latest');
const MANIFEST_PATH = path.join(ROOT, 'metadata', 'registry', 'manifest.json');

export interface ManifestEntry {
  key: string;
  kind: 'blueprint' | 'overlay';
  schemaVersion: string;
  contentVersion: string;
  checksum: string;
  layer: CanonicalLayer;
  sourcePath: string;
  compiledPath: string;
  dependsOn?: string[];
}

export interface ManifestFile {
  generatedAt: string;
  entries: Record<string, ManifestEntry>;
}

export interface LayerRequest {
  module: string;
  route: string;
  tenant?: string | null;
  role?: string | null;
  variant?: string | null;
  locale?: string | null;
}

export interface ResolvedLayer {
  entry: ManifestEntry;
  definition: CanonicalPageDefinition;
}

const readJsonFile = cache(async (absolutePath: string) => {
  const content = await fs.readFile(absolutePath, 'utf-8');
  return JSON.parse(content) as unknown;
});

const ajv = new Ajv({ allErrors: true, strict: false });
let validateSchema: Ajv.ValidateFunction<unknown> | null = null;

async function getValidator() {
  if (!validateSchema) {
    const schema = (await readJsonFile(SCHEMA_PATH)) as Record<string, unknown>;
    validateSchema = ajv.compile(schema);
  }
  return validateSchema;
}

export class MetadataRegistry {
  async resolveLayers(request: LayerRequest): Promise<ResolvedLayer[]> {
    const specs = this.buildLayerRequests(request);
    const layers: ResolvedLayer[] = [];

    for (const spec of specs) {
      const pointer = await this.loadPointer(spec);
      if (!pointer) {
        continue;
      }
      const definition = await this.loadDefinition(pointer.compiledPath);
      layers.push({ entry: pointer, definition });
    }

    if (layers.length === 0) {
      throw new Error(
        `No metadata found for module=${request.module} route=${request.route} locale=${request.locale ?? 'default'}`
      );
    }

    return layers;
  }

  async readManifest(): Promise<ManifestFile | null> {
    try {
      const raw = (await readJsonFile(MANIFEST_PATH)) as ManifestFile;
      return raw;
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  private buildLayerRequests(request: LayerRequest): CanonicalLayer[] {
    const baseLayer: CanonicalLayer = {
      module: request.module,
      route: request.route,
      tenant: null,
      role: null,
      variant: null,
      locale: request.locale ?? null
    };

    const seen = new Set<string>([this.computeKey(baseLayer)]);

    const appendUnique = (layer: CanonicalLayer, target: CanonicalLayer[]) => {
      const key = this.computeKey(layer);
      if (!seen.has(key)) {
        seen.add(key);
        target.push(layer);
      }
    };

    const tenantLayers: CanonicalLayer[] = [];
    const roleLayers: CanonicalLayer[] = [];
    const variantLayers: CanonicalLayer[] = [];
    const localeLayers: CanonicalLayer[] = [];

    if (request.tenant) {
      appendUnique(
        {
          module: request.module,
          route: request.route,
          tenant: request.tenant,
          role: null,
          variant: null,
          locale: request.locale ?? null
        },
        tenantLayers
      );
    }

    if (request.tenant && request.role) {
      appendUnique(
        {
          module: request.module,
          route: request.route,
          tenant: request.tenant,
          role: request.role,
          variant: null,
          locale: request.locale ?? null
        },
        roleLayers
      );
    }

    if (request.variant) {
      appendUnique(
        {
          module: request.module,
          route: request.route,
          tenant: null,
          role: null,
          variant: request.variant,
          locale: request.locale ?? null
        },
        variantLayers
      );
      if (request.tenant) {
        appendUnique(
          {
            module: request.module,
            route: request.route,
            tenant: request.tenant,
            role: null,
            variant: request.variant,
            locale: request.locale ?? null
          },
          variantLayers
        );
      }
    }

    if (request.locale && request.locale !== baseLayer.locale) {
      appendUnique(
        {
          module: request.module,
          route: request.route,
          tenant: request.tenant ?? null,
          role: request.role ?? null,
          variant: request.variant ?? null,
          locale: request.locale
        },
        localeLayers
      );
    }

    return [baseLayer, ...tenantLayers, ...roleLayers, ...variantLayers, ...localeLayers];
  }

  private computeKey(layer: CanonicalLayer): string {
    return [layer.tenant ?? 'global', layer.module, layer.route, layer.role ?? '-', layer.variant ?? '-', layer.locale ?? '-'].join(
      '::'
    );
  }

  private async loadPointer(layer: CanonicalLayer): Promise<ManifestEntry | null> {
    const pointerPath = this.getPointerPath(layer);
    try {
      const content = await fs.readFile(pointerPath, 'utf-8');
      const pointer = JSON.parse(content) as ManifestEntry;
      return pointer;
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  private getPointerPath(layer: CanonicalLayer): string {
    const segments = [sanitize(layer.tenant ?? 'global'), sanitize(layer.module)];
    if (layer.role) {
      segments.push('role', sanitize(layer.role));
    }
    if (layer.variant) {
      segments.push('variant', sanitize(layer.variant));
    }
    if (layer.locale) {
      segments.push('locale', sanitize(layer.locale));
    }
    const routeSegment = sanitize(layer.route);
    return path.join(REGISTRY_LATEST_DIR, ...segments, `${routeSegment}.json`);
  }

  private async loadDefinition(relativePath: string): Promise<CanonicalPageDefinition> {
    const absolute = path.join(ROOT, relativePath);
    const raw = (await readJsonFile(absolute)) as CanonicalPageDefinition;
    const validator = await getValidator();
    const valid = validator(raw);
    if (!valid) {
      throw new Error(`Compiled metadata failed schema validation for ${relativePath}: ${ajv.errorsText(validator.errors)}`);
    }
    return migrateToLatest(raw);
  }
}

function sanitize(value: string): string {
  return value.replace(/[^a-zA-Z0-9-_]/g, '-');
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
