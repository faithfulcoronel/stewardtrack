import { promises as fs } from 'fs';
import path from 'path';
import Ajv, { type ValidateFunction } from 'ajv';
import type { CanonicalPageDefinition, CanonicalLayer } from './generated/canonical';
import { migrateToLatest } from './migrations';

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

export interface MetadataRegistry {
  resolveLayers(request: LayerRequest): Promise<ResolvedLayer[]>;
  readManifest(): Promise<ManifestFile | null>;
}

export interface FileSystemMetadataRegistryOptions {
  rootDir?: string;
  schemaPath?: string;
  latestDir?: string;
  manifestPath?: string;
}

export class FileSystemMetadataRegistry implements MetadataRegistry {
  private readonly rootDir: string;
  private readonly schemaPath: string;
  private readonly latestDir: string;
  private readonly manifestPath: string;
  private validator: ValidateFunction<unknown> | null = null;
  private readonly ajv = new Ajv({ allErrors: true, strict: false });

  constructor(options?: FileSystemMetadataRegistryOptions) {
    this.rootDir = options?.rootDir ?? process.cwd();
    this.schemaPath = options?.schemaPath ?? path.join(this.rootDir, 'metadata', 'schema', 'canonical.schema.json');
    this.latestDir = options?.latestDir ?? path.join(this.rootDir, 'metadata', 'registry', 'latest');
    this.manifestPath = options?.manifestPath ?? path.join(this.rootDir, 'metadata', 'registry', 'manifest.json');
  }

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
        `No metadata found for module=${request.module} route=${request.route} locale=${request.locale ?? 'default'}`,
      );
    }

    return layers;
  }

  async readManifest(): Promise<ManifestFile | null> {
    try {
      const raw = await fs.readFile(this.manifestPath, 'utf-8');
      return JSON.parse(raw) as ManifestFile;
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  private async getValidator(): Promise<ValidateFunction<unknown>> {
    if (!this.validator) {
      const schemaRaw = await fs.readFile(this.schemaPath, 'utf-8');
      const schema = JSON.parse(schemaRaw) as Record<string, unknown>;
      this.validator = this.ajv.compile(schema);
    }
    return this.validator;
  }

  private buildLayerRequests(request: LayerRequest): CanonicalLayer[] {
    const baseLayer: CanonicalLayer = {
      module: request.module,
      route: request.route,
      tenant: null,
      role: null,
      variant: null,
      locale: request.locale ?? null,
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
          locale: request.locale ?? null,
        },
        tenantLayers,
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
          locale: request.locale ?? null,
        },
        roleLayers,
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
          locale: request.locale ?? null,
        },
        variantLayers,
      );
      if (request.tenant) {
        appendUnique(
          {
            module: request.module,
            route: request.route,
            tenant: request.tenant,
            role: null,
            variant: request.variant,
            locale: request.locale ?? null,
          },
          variantLayers,
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
          locale: request.locale,
        },
        localeLayers,
      );
    }

    return [baseLayer, ...tenantLayers, ...roleLayers, ...variantLayers, ...localeLayers];
  }

  private computeKey(layer: CanonicalLayer): string {
    return [
      layer.tenant ?? 'global',
      layer.module,
      layer.route,
      layer.role ?? '-',
      layer.variant ?? '-',
      layer.locale ?? '-',
    ].join('::');
  }

  private async loadPointer(layer: CanonicalLayer): Promise<ManifestEntry | null> {
    const pointerPath = this.getPointerPath(layer);
    try {
      const raw = await fs.readFile(pointerPath, 'utf-8');
      return JSON.parse(raw) as ManifestEntry;
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  private getPointerPath(layer: CanonicalLayer): string {
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
    const routeSegment = sanitizeSegment(layer.route);
    return path.join(this.latestDir, ...segments, `${routeSegment}.json`);
  }

  private async loadDefinition(compiledPath: string): Promise<CanonicalPageDefinition> {
    const absolutePath = path.isAbsolute(compiledPath) ? compiledPath : path.join(this.rootDir, compiledPath);
    const raw = await fs.readFile(absolutePath, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    const validator = await this.getValidator();
    if (!validator(parsed)) {
      const message = (validator.errors ?? []).map((err) => `${err.instancePath} ${err.message ?? ''}`.trim()).join('\n');
      throw new Error(`Invalid canonical metadata at ${absolutePath}:\n${message}`);
    }
    return migrateToLatest(parsed as CanonicalPageDefinition);
  }
}

export function createMetadataRegistry(options?: FileSystemMetadataRegistryOptions): MetadataRegistry {
  return new FileSystemMetadataRegistry(options);
}

function sanitizeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9-_]/g, '-');
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
