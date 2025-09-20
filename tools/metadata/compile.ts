import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { XMLParser } from 'fast-xml-parser';
import { validateXML } from 'xmllint-wasm';
import semver from 'semver';

const ROOT = process.cwd();
const AUTHORING_DIR = path.join(ROOT, 'metadata', 'authoring');
const XSD_PATH = path.join(ROOT, 'metadata', 'xsd', 'page-definition.xsd');
const COMPILED_DIR = path.join(ROOT, 'metadata', 'compiled');
const REGISTRY_LATEST_DIR = path.join(ROOT, 'metadata', 'registry', 'latest');
const MANIFEST_PATH = path.join(ROOT, 'metadata', 'registry', 'manifest.json');

interface CanonicalLayer {
  module: string;
  route: string;
  tenant: string | null;
  role: string | null;
  variant: string | null;
  locale: string | null;
}

type PropValue =
  | { kind: 'static'; value: unknown }
  | { kind: 'binding'; source: string; path?: string | null; fallback?: unknown }
  | { kind: 'expression'; expression: string; fallback?: unknown }
  | { kind: 'action'; actionId: string };

interface CanonicalRBAC {
  allow?: string[];
  deny?: string[];
}

interface CanonicalComponent {
  id: string;
  type?: string;
  operation?: 'merge' | 'replace' | 'remove';
  props?: Record<string, PropValue>;
  children?: CanonicalComponent[];
  rbac?: CanonicalRBAC;
}

interface CanonicalRegion {
  id: string;
  operation?: 'merge' | 'replace' | 'remove';
  components?: CanonicalComponent[];
}

interface CanonicalDataSource {
  id: string;
  kind: 'static' | 'supabase' | 'http';
  operation?: 'merge' | 'replace' | 'remove';
  config?: Record<string, unknown>;
  rbac?: CanonicalRBAC;
}

interface CanonicalAction {
  id: string;
  kind: string;
  operation?: 'merge' | 'replace' | 'remove';
  config?: Record<string, unknown>;
  rbac?: CanonicalRBAC;
}

interface CanonicalPage {
  id?: string;
  title?: string;
  regions?: CanonicalRegion[];
  components?: CanonicalComponent[];
  dataSources?: CanonicalDataSource[];
  actions?: CanonicalAction[];
}

interface CanonicalDefinition {
  schemaVersion: string;
  contentVersion: string;
  checksum: string;
  kind: 'blueprint' | 'overlay';
  layer: CanonicalLayer;
  page: CanonicalPage;
  sourcePath: string;
}

interface ManifestEntry {
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

interface ManifestFile {
  generatedAt: string;
  entries: Record<string, ManifestEntry>;
}

type XmlElement = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  processEntities: true,
  trimValues: true,
  allowBooleanAttributes: true,
  parseAttributeValue: true
});

async function main() {
  const xmlFiles = await collectXmlFiles(AUTHORING_DIR);
  if (xmlFiles.length === 0) {
    console.log('No XML authoring files found.');
    return;
  }

  const xsdContent = await fs.readFile(XSD_PATH, 'utf-8');
  const xsdSchema = xsdContent;

  const manifest = await loadManifest();

  for (const file of xmlFiles) {
    const xmlContent = await fs.readFile(file, 'utf-8');
    await validateAgainstSchema(xmlContent, xsdSchema, file);
    const parsed = parser.parse(xmlContent);
    const canonical = transformToCanonical(parsed, file);
    runCustomValidators(canonical, file);
    const withChecksum = applyChecksum(canonical);
    await writeCompiledArtifact(withChecksum);
    await updateLatestPointer(withChecksum);
    updateManifest(manifest, withChecksum);
  }

  manifest.generatedAt = new Date().toISOString();
  await persistManifest(manifest);
  console.log('Compilation complete.');
}

async function collectXmlFiles(dir: string): Promise<string[]> {
  const result: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectXmlFiles(fullPath);
      result.push(...nested);
    } else if (entry.isFile() && fullPath.endsWith('.xml')) {
      result.push(fullPath);
    }
  }
  return result.sort();
}

async function validateAgainstSchema(xmlContent: string, xsdSchema: string, filePath: string) {
  const result = await validateXML({
    xml: [{ fileName: path.basename(filePath), contents: xmlContent }],
    schema: [xsdSchema]
  });
  if (!result.valid) {
    const errors = (result.errors ?? []).map((err) => err.rawMessage ?? err.message ?? String(err)).join('\n');
    const message = errors || 'Unknown validation error.';
    throw new Error(`XSD validation failed for ${filePath}:\n${message}`);
  }
}

function transformToCanonical(parsed: unknown, filePath: string): CanonicalDefinition {
  if (!isRecord(parsed)) {
    throw new Error(`Unexpected XML structure in ${filePath}`);
  }
  const rootElement = parsed.PageDefinition;
  if (!isRecord(rootElement)) {
    throw new Error(`Missing PageDefinition root in ${filePath}`);
  }
  const root = rootElement as XmlElement;

  const kind = root['@_kind'];
  const schemaVersion = root['@_schemaVersion'];
  const contentVersion = root['@_contentVersion'];
  const layer: CanonicalLayer = {
    module: String(root['@_module'] ?? ''),
    route: String(root['@_route'] ?? ''),
    tenant: root['@_tenant'] ? String(root['@_tenant']) : null,
    role: root['@_role'] ? String(root['@_role']) : null,
    variant: root['@_variant'] ? String(root['@_variant']) : null,
    locale: root['@_locale'] ? String(root['@_locale']) : null
  };

  const page: CanonicalPage = {};
  if (isRecord(root.Page)) {
    const pageNode = root.Page as XmlElement;
    page.id = pageNode['@_id'] ? String(pageNode['@_id']) : undefined;
    page.title = typeof pageNode.Title === 'string' ? pageNode.Title : undefined;
    if (isRecord(pageNode.Regions)) {
      const regionContainer = pageNode.Regions as XmlElement;
      const regions = ensureArray(regionContainer.Region as XmlElement | XmlElement[] | undefined);
      page.regions = regions.map((regionNode) => normalizeRegion(regionNode));
    }
    if (isRecord(pageNode.DataSources)) {
      const sourceContainer = pageNode.DataSources as XmlElement;
      const sources = ensureArray(sourceContainer.DataSource as XmlElement | XmlElement[] | undefined);
      page.dataSources = sources.map((sourceNode) => normalizeDataSource(sourceNode));
    }
    if (isRecord(pageNode.Actions)) {
      const actionContainer = pageNode.Actions as XmlElement;
      const actions = ensureArray(actionContainer.Action as XmlElement | XmlElement[] | undefined);
      page.actions = actions.map((actionNode) => normalizeAction(actionNode));
    }
  }

  if (isRecord(root.Overlay)) {
    const overlayNode = root.Overlay as XmlElement;
    if (isRecord(overlayNode.Regions)) {
      const regions = ensureArray((overlayNode.Regions as XmlElement).Region as XmlElement | XmlElement[] | undefined);
      page.regions = regions.map((regionNode) => normalizeRegion(regionNode));
    }
    if (isRecord(overlayNode.Components)) {
      const components = ensureArray((overlayNode.Components as XmlElement).Component as XmlElement | XmlElement[] | undefined);
      page.components = components.map((componentNode) => normalizeComponent(componentNode));
    }
    if (isRecord(overlayNode.DataSources)) {
      const sources = ensureArray((overlayNode.DataSources as XmlElement).DataSource as XmlElement | XmlElement[] | undefined);
      page.dataSources = sources.map((sourceNode) => normalizeDataSource(sourceNode));
    }
    if (isRecord(overlayNode.Actions)) {
      const actions = ensureArray((overlayNode.Actions as XmlElement).Action as XmlElement | XmlElement[] | undefined);
      page.actions = actions.map((actionNode) => normalizeAction(actionNode));
    }
  }

  return {
    schemaVersion: String(schemaVersion),
    contentVersion: String(contentVersion),
    checksum: '',
    kind: kind === 'overlay' ? 'overlay' : 'blueprint',
    layer,
    page,
    sourcePath: path.relative(ROOT, filePath)
  };
}

function normalizeRegion(region: XmlElement): CanonicalRegion {
  const regionNode: CanonicalRegion = {
    id: String(region['@_id'] ?? ''),
    operation: region['@_operation'] ?? undefined
  };
  const components = ensureArray(region.Component as XmlElement | XmlElement[] | undefined);
  if (components.length > 0) {
    regionNode.components = components.map((component) => normalizeComponent(component));
  }
  return regionNode;
}

function normalizeComponent(component: XmlElement): CanonicalComponent {
  const node: CanonicalComponent = {
    id: String(component['@_id'] ?? ''),
    type: component['@_type'] ? String(component['@_type']) : undefined,
    operation: component['@_operation'] ?? undefined
  };

  if (isRecord(component.RBAC)) {
    node.rbac = normalizeRBAC(component.RBAC as XmlElement);
  }

  if (isRecord(component.Props)) {
    const propsElement = component.Props as XmlElement;
    const propEntries = ensureArray(propsElement.Prop as XmlElement | XmlElement[] | undefined);
    if (propEntries.length > 0) {
      node.props = {};
      for (const prop of propEntries) {
        const name = String(prop['@_name']);
        node.props[name] = normalizeProp(prop);
      }
    }
  }

  if (isRecord(component.Children)) {
    const childElement = component.Children as XmlElement;
    const children = ensureArray(childElement.Component as XmlElement | XmlElement[] | undefined);
    if (children.length > 0) {
      node.children = children.map((child) => normalizeComponent(child));
    }
  }

  return node;
}

function normalizeProp(prop: XmlElement): PropValue {
  const kind = prop['@_kind'];
  switch (kind) {
    case 'binding': {
      const source = String(prop['@_source'] ?? '');
      const binding: PropValue = {
        kind: 'binding',
        source,
        path: prop['@_path'] ? String(prop['@_path']) : null
      };
      if (prop['@_fallback']) {
        binding.fallback = parseScalar(String(prop['@_fallback']), prop['@_format']);
      }
      return binding;
    }
    case 'expression': {
      const expression = extractNodeValue(prop);
      return { kind: 'expression', expression: expression ?? '' };
    }
    case 'action':
      return { kind: 'action', actionId: String(prop['@_actionId'] ?? '') };
    case 'static':
    default: {
      const value = extractNodeValue(prop);
      return { kind: 'static', value: parseScalar(value ?? '', prop['@_format']) };
    }
  }
}

function parseScalar(value: string | null, format?: string): unknown {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  if (!format || format === 'text') {
    return trimmed;
  }
  if (format === 'number') {
    return Number(trimmed);
  }
  if (format === 'boolean') {
    return trimmed === 'true';
  }
  if (format === 'json') {
    return JSON.parse(trimmed);
  }
  return trimmed;
}

function normalizeDataSource(source: XmlElement): CanonicalDataSource {
  const node: CanonicalDataSource = {
    id: String(source['@_id'] ?? ''),
    kind: (source['@_kind'] ?? 'static') as CanonicalDataSource['kind'],
    operation: source['@_operation'] ?? undefined
  };
  if (isRecord(source.RBAC)) {
    node.rbac = normalizeRBAC(source.RBAC as XmlElement);
  }
  if (source.Json) {
    const value = typeof source.Json === 'string' ? source.Json : extractNodeValue(source.Json as XmlElement);
    if (typeof value === 'string') {
      node.config = {
        ...(node.config ?? {}),
        value: JSON.parse(value.trim())
      };
    }
  }
  if (isRecord(source.Config)) {
    node.config = {
      ...(node.config ?? {}),
      ...normalizeConfig(source.Config as XmlElement)
    };
  }
  return node;
}

function normalizeAction(action: XmlElement): CanonicalAction {
  const node: CanonicalAction = {
    id: String(action['@_id'] ?? ''),
    kind: String(action['@_kind'] ?? ''),
    operation: action['@_operation'] ?? undefined
  };
  if (isRecord(action.RBAC)) {
    node.rbac = normalizeRBAC(action.RBAC as XmlElement);
  }
  if (isRecord(action.Config)) {
    node.config = normalizeConfig(action.Config as XmlElement);
  }
  return node;
}

function normalizeRBAC(rbac: XmlElement): CanonicalRBAC {
  const allowRaw = rbac['@_allow'];
  const denyRaw = rbac['@_deny'];
  return {
    allow: allowRaw ? String(allowRaw).split(',').map((entry) => entry.trim()).filter(Boolean) : undefined,
    deny: denyRaw ? String(denyRaw).split(',').map((entry) => entry.trim()).filter(Boolean) : undefined
  };
}

function normalizeConfig(node: XmlElement): Record<string, unknown> {
  if (typeof node !== 'object' || node == null) {
    return {};
  }
  const entries: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('@_')) {
      continue;
    }
    if (key === '#text') {
      const text = typeof value === 'string' ? value.trim() : '';
      if (text) {
        entries.value = text;
      }
      continue;
    }
    entries[key] = normalizeConfigValue(value);
  }
  return entries;
}

function normalizeConfigValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeConfigValue(item));
  }
  if (value && typeof value === 'object') {
    const nested = normalizeConfig(value as XmlElement);
    if (Object.keys(nested).length === 0 && typeof (value as XmlElement)['#text'] === 'string') {
      return (value as XmlElement)['#text'].trim();
    }
    return nested;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return null;
    }
    if (trimmed === 'true' || trimmed === 'false') {
      return trimmed === 'true';
    }
    const numeric = Number(trimmed);
    if (!Number.isNaN(numeric) && trimmed !== '') {
      return numeric;
    }
    return trimmed;
  }
  return value;
}

function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function extractNodeValue(node: XmlElement | string | undefined): string | null {
  if (node == null) {
    return null;
  }
  if (typeof node === 'string') {
    return node;
  }
  if (typeof node['#text'] === 'string') {
    return node['#text'] as string;
  }
  return null;
}

function runCustomValidators(definition: CanonicalDefinition, filePath: string) {
  if (!semver.valid(definition.schemaVersion)) {
    throw new Error(`Invalid schemaVersion in ${filePath}. Use semantic versioning.`);
  }
  if (!semver.valid(definition.contentVersion)) {
    throw new Error(`Invalid contentVersion in ${filePath}. Use semantic versioning.`);
  }

  if (!definition.layer.module || !definition.layer.route) {
    throw new Error(`Missing module/route metadata in ${filePath}.`);
  }

  if (definition.kind === 'overlay' && !definition.layer.tenant && !definition.layer.role && !definition.layer.variant) {
    throw new Error(`Overlay definitions must target a tenant, role, or variant (${filePath}).`);
  }

  if (definition.kind === 'blueprint' && !definition.page.id) {
    throw new Error(`Blueprints must include a page id (${filePath}).`);
  }

  const componentIds = new Set<string>();
  const dataSourceIds = new Set<string>();
  const actionIds = new Set<string>();

  const pendingBindings: { sourceId: string; location: string }[] = [];

  const inspectComponent = (component: CanonicalComponent, trail: string[]) => {
    const key = component.id;
    const existing = componentIds.has(key);
    if (definition.kind === 'blueprint' && existing) {
      throw new Error(`Duplicate component id "${key}" found in ${filePath} at ${trail.join(' > ')}`);
    }
    componentIds.add(key);
    if (component.children) {
      component.children.forEach((child) => inspectComponent(child, [...trail, child.id]));
    }
    if (component.props) {
      for (const prop of Object.values(component.props)) {
        if (prop.kind === 'binding' && definition.kind === 'blueprint') {
          const sourceId = prop.source;
          if (!dataSourceIds.has(sourceId)) {
            pendingBindings.push({ sourceId, location: trail.concat(component.id).join(' > ') });
          }
        }
      }
    }
  };

  const registerDataSource = (source: CanonicalDataSource) => {
    if (definition.kind === 'blueprint' && dataSourceIds.has(source.id)) {
      throw new Error(`Duplicate data source id "${source.id}" found in ${filePath}.`);
    }
    dataSourceIds.add(source.id);
  };

  const registerAction = (action: CanonicalAction) => {
    if (definition.kind === 'blueprint' && actionIds.has(action.id)) {
      throw new Error(`Duplicate action id "${action.id}" found in ${filePath}.`);
    }
    actionIds.add(action.id);
  };

  definition.page.regions?.forEach((region) => {
    region.components?.forEach((component) => inspectComponent(component, [region.id, component.id]));
  });
  definition.page.components?.forEach((component) => inspectComponent(component, [component.id]));
  definition.page.dataSources?.forEach((dataSource) => registerDataSource(dataSource));
  definition.page.actions?.forEach((action) => registerAction(action));

  if (definition.kind === 'blueprint') {
    for (const binding of pendingBindings) {
      if (!dataSourceIds.has(binding.sourceId)) {
        throw new Error(`Binding references unknown data source "${binding.sourceId}" in ${filePath} (${binding.location}).`);
      }
    }
  }
}

function applyChecksum(definition: CanonicalDefinition): CanonicalDefinition {
  const rest = { ...definition } as Partial<CanonicalDefinition>;
  delete rest.checksum;
  const serialized = stableStringify(rest);
  const checksum = crypto.createHash('sha256').update(serialized).digest('hex');
  return { ...definition, checksum };
}

function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_, val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      return Object.keys(val)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = (val as Record<string, unknown>)[key];
          return acc;
        }, {});
    }
    return val;
  });
}

async function writeCompiledArtifact(definition: CanonicalDefinition) {
  const compiledPath = getCompiledPath(definition);
  await fs.mkdir(path.dirname(compiledPath), { recursive: true });
  await fs.writeFile(compiledPath, JSON.stringify(definition, null, 2) + '\n');
  console.log(`✔ Compiled ${definition.sourcePath} → ${path.relative(ROOT, compiledPath)}`);
}

function getCompiledPath(definition: CanonicalDefinition): string {
  const segments = buildLayerSegments(definition.layer);
  const routeSegment = sanitizeSegment(definition.layer.route);
  const dir = path.join(COMPILED_DIR, ...segments, routeSegment, definition.schemaVersion);
  return path.join(dir, `${definition.contentVersion}.json`);
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

async function updateLatestPointer(definition: CanonicalDefinition) {
  const pointerPath = getLatestPointerPath(definition);
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

  if (shouldWrite) {
    const compiledPath = path.relative(ROOT, getCompiledPath(definition));
    const pointer: ManifestEntry = {
      key: computeManifestKey(definition.layer),
      kind: definition.kind,
      schemaVersion: definition.schemaVersion,
      contentVersion: definition.contentVersion,
      checksum: definition.checksum,
      layer: definition.layer,
      sourcePath: definition.sourcePath,
      compiledPath
    };
    await fs.writeFile(pointerPath, JSON.stringify(pointer, null, 2) + '\n');
  }
}

function getLatestPointerPath(definition: CanonicalDefinition): string {
  const segments = buildLayerSegments(definition.layer);
  const routeSegment = sanitizeSegment(definition.layer.route);
  const dir = path.join(REGISTRY_LATEST_DIR, ...segments);
  return path.join(dir, `${routeSegment}.json`);
}

function compareContentVersions(next: string, previous: string): number {
  const validNext = semver.valid(next);
  const validPrev = semver.valid(previous);
  if (validNext && validPrev) {
    return semver.compare(validNext, validPrev);
  }
  return next.localeCompare(previous);
}

async function loadManifest(): Promise<ManifestFile> {
  try {
    const raw = await fs.readFile(MANIFEST_PATH, 'utf-8');
    return JSON.parse(raw) as ManifestFile;
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return { generatedAt: new Date().toISOString(), entries: {} };
    }
    throw error;
  }
}

function updateManifest(manifest: ManifestFile, definition: CanonicalDefinition) {
  const key = computeManifestKey(definition.layer);
  const compiledPath = path.relative(ROOT, getCompiledPath(definition));
  const entry: ManifestEntry = {
    key,
    kind: definition.kind,
    schemaVersion: definition.schemaVersion,
    contentVersion: definition.contentVersion,
    checksum: definition.checksum,
    layer: definition.layer,
    sourcePath: definition.sourcePath,
    compiledPath,
    dependsOn: definition.kind === 'overlay' ? [computeManifestKey({ ...definition.layer, tenant: null, role: null, variant: null })] : undefined
  };
  manifest.entries[key] = entry;
}

function computeManifestKey(layer: CanonicalLayer): string {
  return [layer.tenant ?? 'global', layer.module, layer.route, layer.role ?? '-', layer.variant ?? '-', layer.locale ?? '-'].join('::');
}

async function persistManifest(manifest: ManifestFile) {
  const sortedEntries = Object.keys(manifest.entries)
    .sort()
    .reduce<Record<string, ManifestEntry>>((acc, key) => {
      acc[key] = manifest.entries[key];
      return acc;
    }, {});
  const payload: ManifestFile = {
    generatedAt: manifest.generatedAt,
    entries: sortedEntries
  };
  await fs.mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(payload, null, 2) + '\n');
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
