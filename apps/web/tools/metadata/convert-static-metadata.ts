import fs from 'node:fs/promises';
import path from 'node:path';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';

interface BindingReference {
  path: string;
  description: string;
}

type BindingMap = Map<string, Map<string, BindingReference>>;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  processEntities: true,
  trimValues: false,
  allowBooleanAttributes: true,
});

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  format: true,
  suppressEmptyNode: true,
  indentBy: '  ',
});

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null;
}

function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function toFieldName(path: string): string {
  const trimmed = path.trim();
  if (!trimmed || trimmed === '$') {
    return 'value';
  }
  const sanitized = trimmed
    .replace(/^\$\.?/, '')
    .replace(/\[(\d+)\]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim();
  if (!sanitized) {
    return 'value';
  }
  const segments = sanitized.split(' ').filter(Boolean);
  const candidate = segments[segments.length - 1] ?? 'value';
  return candidate.charAt(0).toLowerCase() + candidate.slice(1);
}

function recordBinding(
  bindings: BindingMap,
  sourceId: string,
  path: string,
  description: string,
): string {
  const fieldName = toFieldName(path);
  if (!bindings.has(sourceId)) {
    bindings.set(sourceId, new Map());
  }
  const entry = bindings.get(sourceId)!;
  if (!entry.has(fieldName)) {
    entry.set(fieldName, { path, description });
  }
  return fieldName;
}

function createFieldNode(name: string, value: unknown): Record<string, unknown> {
  const node: Record<string, unknown> = { '@_name': name };
  if (Array.isArray(value)) {
    node.Array = [createArrayNode(value)];
  } else if (isRecord(value)) {
    node.Object = [createObjectNode(value)];
  } else {
    node.Value = [formatScalar(value)];
  }
  return node;
}

function createObjectNode(value: Record<string, unknown>): Record<string, unknown> {
  const fieldNodes = Object.entries(value).map(([key, child]) => createFieldNode(key, child));
  const node: Record<string, unknown> = {};
  if (fieldNodes.length > 0) {
    node.Field = fieldNodes;
  }
  return node;
}

function createArrayNode(values: unknown[]): Record<string, unknown> {
  const arrayNode: Record<string, unknown> = {};
  const primitiveValues: unknown[] = [];
  const objectNodes: Record<string, unknown>[] = [];
  const nestedArrays: Record<string, unknown>[] = [];

  for (const value of values) {
    if (Array.isArray(value)) {
      nestedArrays.push(createArrayNode(value));
    } else if (isRecord(value)) {
      objectNodes.push(createObjectNode(value));
    } else {
      primitiveValues.push(formatScalar(value));
    }
  }

  if (objectNodes.length > 0) {
    arrayNode.Object = objectNodes;
  }
  if (nestedArrays.length > 0) {
    arrayNode.Array = nestedArrays;
  }
  if (primitiveValues.length > 0) {
    arrayNode.Value = primitiveValues;
  }
  return arrayNode;
}

function formatScalar(value: unknown): unknown {
  if (value === null || value === undefined) {
    return '';
  }
  return value;
}

function buildDataNode(json: unknown): Record<string, unknown> {
  if (Array.isArray(json)) {
    return { Array: [createArrayNode(json)] };
  }
  if (isRecord(json)) {
    const fields = Object.entries(json).map(([key, value]) => createFieldNode(key, value));
    return fields.length > 0 ? { Field: fields } : {};
  }
  return { Value: [formatScalar(json)] };
}

function walkComponents(node: any, bindings: BindingMap, context: string) {
  if (!isRecord(node)) {
    return;
  }
  const propsNodes = ensureArray(node.Props);
  for (const props of propsNodes) {
    if (!isRecord(props)) continue;
    const propEntries = ensureArray(props.Prop as any);
    for (const prop of propEntries) {
      if (!isRecord(prop)) continue;
      if (prop['@_kind'] !== 'binding') continue;
      const sourceId = String(prop['@_source'] ?? '').trim();
      const path = String(prop['@_path'] ?? '$').trim();
      if (!sourceId) {
        continue;
      }
      const description = `Binding for ${context}.${prop['@_name'] ?? 'prop'}`;
      const fieldName = recordBinding(bindings, sourceId, path, description);
      delete prop['@_source'];
      delete prop['@_path'];
      prop['@_contract'] = `${sourceId}.${fieldName}`;
    }
  }
}

function collectBindings(root: any, bindings: BindingMap) {
  if (!isRecord(root)) {
    return;
  }
  if (isRecord(root.Page)) {
    const page = root.Page;
    if (isRecord(page.Regions)) {
      for (const region of ensureArray(page.Regions.Region)) {
        if (!isRecord(region)) continue;
        for (const component of ensureArray(region.Component)) {
          if (!isRecord(component)) continue;
          const componentId = String(component['@_id'] ?? 'component');
          walkComponents(component, bindings, componentId);
        }
      }
    }
  }
  if (isRecord(root.Overlay)) {
    const overlay = root.Overlay;
    if (isRecord(overlay.Regions)) {
      for (const region of ensureArray(overlay.Regions.Region)) {
        if (!isRecord(region)) continue;
        for (const component of ensureArray(region.Component)) {
          if (!isRecord(component)) continue;
          const componentId = String(component['@_id'] ?? 'component');
          walkComponents(component, bindings, componentId);
        }
      }
    }
    if (isRecord(overlay.Components)) {
      for (const component of ensureArray(overlay.Components.Component)) {
        if (!isRecord(component)) continue;
        const componentId = String(component['@_id'] ?? 'component');
        walkComponents(component, bindings, componentId);
      }
    }
  }
}

function applyContracts(root: any, bindings: BindingMap) {
  if (!isRecord(root)) {
    return;
  }
  const processDataSources = (container: any) => {
    for (const source of ensureArray(container.DataSource)) {
      if (!isRecord(source)) continue;
      const sourceId = String(source['@_id'] ?? '').trim();
      if (!sourceId) continue;
      if (!source.Json) continue;
      const value = typeof source.Json === 'string' ? source.Json : source.Json['#text'];
      if (typeof value !== 'string') {
        continue;
      }
      let json: unknown;
      try {
        json = JSON.parse(value);
      } catch (error) {
        console.warn(`Failed to parse JSON for ${sourceId}: ${(error as Error).message}`);
        continue;
      }
      delete source.Json;
      const fieldMap = bindings.get(sourceId) ?? new Map([[
        'value',
        { path: '$', description: `Default binding for ${sourceId}` },
      ]]);
      const contractFields = Array.from(fieldMap.entries()).map(([name, ref]) => ({
        '@_name': name,
        '@_path': ref.path || '$',
        '@_description': ref.description,
      }));
      const existingConfig = source.Config;
      if (existingConfig) {
        delete source.Config;
      }
      source.Contract = { Field: contractFields };
      if (existingConfig) {
        source.Config = existingConfig;
      }
      source.Data = buildDataNode(json);
    }
  };

  if (isRecord(root.Page) && isRecord(root.Page.DataSources)) {
    processDataSources(root.Page.DataSources);
  }
  if (isRecord(root.Overlay) && isRecord(root.Overlay.DataSources)) {
    processDataSources(root.Overlay.DataSources);
  }
}

async function convertFile(filePath: string) {
  const content = await fs.readFile(filePath, 'utf8');
  const parsed = parser.parse(content);
  if (!isRecord(parsed) || !isRecord(parsed.PageDefinition)) {
    return;
  }
  const root = parsed.PageDefinition;
  const bindings: BindingMap = new Map();
  collectBindings(root, bindings);
  applyContracts(root, bindings);
  pruneWhitespace(parsed);
  const output = builder.build(parsed);
  const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n';
  await fs.writeFile(filePath, xmlHeader + output.replace(/^\s*<\?xml[^>]*>\s*/i, ''));
}

function pruneWhitespace(node: unknown): void {
  if (Array.isArray(node)) {
    for (let i = node.length - 1; i >= 0; i -= 1) {
      const entry = node[i];
      if (typeof entry === 'string') {
        if (entry.trim() === '') {
          node.splice(i, 1);
        }
      } else {
        pruneWhitespace(entry);
        if (Array.isArray(entry) && entry.length === 0) {
          node.splice(i, 1);
        }
      }
    }
    return;
  }
  if (!isRecord(node)) {
    return;
  }
  for (const key of Object.keys(node)) {
    const value = node[key];
    if (typeof value === 'string') {
      if (value.trim() === '') {
        delete node[key];
      }
    } else {
      pruneWhitespace(value);
      if (Array.isArray(value) && value.length === 0) {
        delete node[key];
      } else if (isRecord(value) && Object.keys(value).length === 0) {
        if (key === '#text') {
          delete node[key];
        }
      }
    }
  }
}

async function walkDirectory(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkDirectory(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.xml')) {
      files.push(fullPath);
    }
  }
  return files;
}

async function main() {
  const rootDir = path.resolve(__dirname, '..', '..');
  const metadataDir = path.join(rootDir, 'metadata');
  const files = await walkDirectory(metadataDir);
  for (const file of files) {
    await convertFile(file);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
