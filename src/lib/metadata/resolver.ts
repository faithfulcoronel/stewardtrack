import crypto from 'crypto';
import { unstable_cache } from 'next/cache';
import type {
  CanonicalAction,
  CanonicalComponent,
  CanonicalDataSource,
  CanonicalPageDefinition,
  CanonicalRegion
} from './generated/canonical';
import { MetadataRegistry, ResolvedLayer, type LayerRequest } from './registry';

export interface ResolveOptions extends LayerRequest {
  featureFlags?: Record<string, boolean>;
}

export interface ResolvedMetadata {
  definition: CanonicalPageDefinition;
  layers: ResolvedLayer[];
  cacheKey: string;
  fingerprints: string[];
}

const registry = new MetadataRegistry();

const resolveCached = unstable_cache(
  async (options: ResolveOptions): Promise<ResolvedMetadata> => {
    const layers = await registry.resolveLayers(options);
    const merged = mergeLayers(layers);
    const cacheKey = computeCacheKey(options, merged, layers);
    const fingerprints = layers.map((layer) => `${layer.entry.key}@${layer.entry.contentVersion}`);
    return {
      definition: merged,
      layers,
      cacheKey,
      fingerprints
    };
  },
  ['metadata-resolver'],
  { revalidate: 60 }
);

export async function resolvePageMetadata(options: ResolveOptions): Promise<ResolvedMetadata> {
  return resolveCached(normalizeOptions(options));
}

function normalizeOptions(options: ResolveOptions): ResolveOptions {
  return {
    ...options,
    tenant: options.tenant ?? null,
    role: options.role ?? null,
    variant: options.variant ?? null,
    locale: options.locale ?? null,
    featureFlags: options.featureFlags ?? {}
  };
}

function mergeLayers(layers: ResolvedLayer[]): CanonicalPageDefinition {
  if (layers.length === 0) {
    throw new Error('Cannot merge empty metadata layers.');
  }
  const [base, ...overlays] = layers;
  let merged: CanonicalPageDefinition = structuredClone(base.definition);

  for (const layer of overlays) {
    merged = applyOverlay(merged, layer.definition);
  }

  merged.contentVersion = [base.definition.contentVersion, ...overlays.map((layer) => layer.definition.contentVersion)].join('+');
  merged.checksum = crypto.createHash('sha256').update(JSON.stringify(merged.page)).digest('hex');
  return merged;
}

function applyOverlay(base: CanonicalPageDefinition, overlay: CanonicalPageDefinition): CanonicalPageDefinition {
  const next = structuredClone(base);
  const overlayPage = overlay.page ?? {};

  if (overlayPage.title) {
    next.page.title = overlayPage.title;
  }

  if (overlayPage.regions) {
    next.page.regions = mergeRegions(next.page.regions ?? [], overlayPage.regions);
  }

  if (overlayPage.components) {
    next.page.regions = applyLooseComponentPatches(next.page.regions ?? [], overlayPage.components);
  }

  if (overlayPage.dataSources) {
    next.page.dataSources = mergeById(next.page.dataSources ?? [], overlayPage.dataSources, mergeDataSource);
  }

  if (overlayPage.actions) {
    next.page.actions = mergeById(next.page.actions ?? [], overlayPage.actions, mergeAction);
  }

  return next;
}

function mergeRegions(base: CanonicalRegion[], overlays: CanonicalRegion[]): CanonicalRegion[] {
  return mergeById(base, overlays, mergeRegion);
}

function mergeRegion(base: CanonicalRegion, overlay: CanonicalRegion): CanonicalRegion {
  if (overlay.operation === 'replace') {
    return structuredClone(overlay);
  }

  const next: CanonicalRegion = structuredClone(base);
  if (overlay.operation === 'remove') {
    return { ...next, components: [] };
  }
  if (overlay.components) {
    next.components = mergeById(next.components ?? [], overlay.components, mergeComponent);
  }
  return next;
}

function mergeComponent(base: CanonicalComponent, overlay: CanonicalComponent): CanonicalComponent {
  if (overlay.operation === 'replace') {
    return structuredClone(overlay);
  }
  if (overlay.operation === 'remove') {
    return { ...structuredClone(base), props: undefined, children: undefined };
  }
  const next: CanonicalComponent = structuredClone(base);
  if (overlay.type) {
    next.type = overlay.type;
  }
  if (overlay.rbac) {
    next.rbac = overlay.rbac;
  }
  if (overlay.props) {
    next.props = { ...(next.props ?? {}) };
    for (const [key, value] of Object.entries(overlay.props)) {
      next.props[key] = value;
    }
  }
  if (overlay.children) {
    next.children = mergeById(next.children ?? [], overlay.children, mergeComponent);
  }
  return next;
}

function applyLooseComponentPatches(
  regions: CanonicalRegion[],
  patches: CanonicalComponent[]
): CanonicalRegion[] {
  if (patches.length === 0) {
    return regions;
  }
  return regions.map((region) => ({
    ...region,
    components: applyComponentPatches(region.components ?? [], patches)
  }));
}

function applyComponentPatches(components: CanonicalComponent[], patches: CanonicalComponent[]): CanonicalComponent[] {
  let current = components.map((component) => structuredClone(component));
  for (const patch of patches) {
    current = mergeComponentIntoList(current, patch);
  }
  return current;
}

function mergeComponentIntoList(list: CanonicalComponent[], patch: CanonicalComponent): CanonicalComponent[] {
  const result: CanonicalComponent[] = [];
  let applied = false;
  for (const component of list) {
    if (component.id === patch.id) {
      applied = true;
      if (patch.operation === 'remove') {
        continue;
      }
      if (patch.operation === 'replace') {
        result.push(structuredClone(patch));
      } else {
        result.push(mergeComponent(component, patch));
      }
    } else {
      const next = structuredClone(component);
      if (next.children) {
        next.children = mergeComponentIntoList(next.children, patch);
      }
      result.push(next);
    }
  }
  if (!applied && patch.operation !== 'remove') {
    result.push(structuredClone(patch));
  }
  return result;
}

function mergeDataSource(base: CanonicalDataSource, overlay: CanonicalDataSource): CanonicalDataSource {
  if (overlay.operation === 'replace') {
    return structuredClone(overlay);
  }
  if (overlay.operation === 'remove') {
    return { ...structuredClone(base), config: undefined };
  }
  const next: CanonicalDataSource = structuredClone(base);
  if (overlay.kind) {
    next.kind = overlay.kind;
  }
  if (overlay.rbac) {
    next.rbac = overlay.rbac;
  }
  if (overlay.config) {
    next.config = deepMerge(next.config ?? {}, overlay.config);
  }
  return next;
}

function mergeAction(base: CanonicalAction, overlay: CanonicalAction): CanonicalAction {
  if (overlay.operation === 'replace') {
    return structuredClone(overlay);
  }
  if (overlay.operation === 'remove') {
    return { ...structuredClone(base), config: undefined };
  }
  const next: CanonicalAction = structuredClone(base);
  if (overlay.kind) {
    next.kind = overlay.kind;
  }
  if (overlay.config) {
    next.config = deepMerge(next.config ?? {}, overlay.config);
  }
  if (overlay.rbac) {
    next.rbac = overlay.rbac;
  }
  return next;
}

type Mergeable = Record<string, unknown>;

function mergeById<T extends { id: string; operation?: string }>(
  base: T[],
  overlays: T[],
  mergeItem: (base: T, overlay: T) => T
): T[] {
  const map = new Map<string, T>();
  const order: string[] = [];

  for (const item of base) {
    const clone = structuredClone(item);
    map.set(item.id, clone);
    order.push(item.id);
  }

  for (const patch of overlays) {
    if (patch.operation === 'remove') {
      map.delete(patch.id);
      continue;
    }
    if (map.has(patch.id)) {
      const existing = map.get(patch.id)!;
      const merged = mergeItem(existing, patch);
      map.set(patch.id, merged);
    } else {
      map.set(patch.id, structuredClone(patch));
      order.push(patch.id);
    }
  }

  return order
    .filter((id) => map.has(id))
    .map((id) => map.get(id)!)
    .concat(
      overlays
        .filter((patch) => !order.includes(patch.id) && patch.operation !== 'remove')
        .map((patch) => structuredClone(patch))
    );
}

function deepMerge<T extends Mergeable>(target: T, source: Mergeable): T {
  const next: Mergeable = Array.isArray(target) ? [...(target as unknown[])] : { ...target };
  for (const [key, value] of Object.entries(source)) {
    const current = (next as Mergeable)[key];
    if (isPlainObject(current) && isPlainObject(value)) {
      (next as Mergeable)[key] = deepMerge(current as Mergeable, value as Mergeable);
    } else {
      (next as Mergeable)[key] = structuredClone(value);
    }
  }
  return next as T;
}

function isPlainObject(value: unknown): value is Mergeable {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function computeCacheKey(
  options: ResolveOptions,
  merged: CanonicalPageDefinition,
  layers: ResolvedLayer[]
): string {
  const hash = crypto.createHash('sha256');
  hash.update(options.tenant ?? 'global');
  hash.update('|');
  hash.update(options.module);
  hash.update('|');
  hash.update(options.route);
  hash.update('|');
  hash.update(options.role ?? 'guest');
  hash.update('|');
  hash.update(options.locale ?? 'default');
  hash.update('|');
  hash.update(JSON.stringify(options.featureFlags ?? {}));
  hash.update('|');
  hash.update(layers.map((layer) => layer.entry.contentVersion).join('+'));
  hash.update('|');
  hash.update(merged.checksum);
  return hash.digest('hex');
}


