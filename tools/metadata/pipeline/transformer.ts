import path from 'path';
import { XMLParser } from 'fast-xml-parser';
import {
  CanonicalAction,
  CanonicalComponent,
  CanonicalDataSource,
  CanonicalDefinition,
  CanonicalLayer,
  CanonicalPage,
  CanonicalRegion,
  CanonicalRBAC,
  OPERATION_VALUES,
  Operation,
  PropValue,
  XmlElement,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isOperation(value: unknown): value is Operation {
  return typeof value === 'string' && (OPERATION_VALUES as readonly string[]).includes(value);
}

function parseOperation(value: unknown): Operation | undefined {
  return isOperation(value) ? value : undefined;
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

export class CanonicalTransformer {
  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    processEntities: true,
    trimValues: true,
    allowBooleanAttributes: true,
    parseAttributeValue: true,
  });

  constructor(private readonly rootDir: string) {}

  parse(xmlContent: string): unknown {
    return this.parser.parse(xmlContent);
  }

  fromXml(xmlContent: string, filePath: string): CanonicalDefinition {
    const parsed = this.parse(xmlContent);
    return this.transform(parsed, filePath);
  }

  transform(parsed: unknown, filePath: string): CanonicalDefinition {
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
      locale: root['@_locale'] ? String(root['@_locale']) : null,
    };

    const page: CanonicalPage = {};
    if (isRecord(root.Page)) {
      const pageNode = root.Page as XmlElement;
      page.id = pageNode['@_id'] ? String(pageNode['@_id']) : undefined;
      page.title = typeof pageNode.Title === 'string' ? pageNode.Title : undefined;
      if (isRecord(pageNode.Regions)) {
        const regionContainer = pageNode.Regions as XmlElement;
        const regions = ensureArray(regionContainer.Region as XmlElement | XmlElement[] | undefined);
        page.regions = regions.map((regionNode) => this.normalizeRegion(regionNode));
      }
      if (isRecord(pageNode.DataSources)) {
        const sourceContainer = pageNode.DataSources as XmlElement;
        const sources = ensureArray(sourceContainer.DataSource as XmlElement | XmlElement[] | undefined);
        page.dataSources = sources.map((sourceNode) => this.normalizeDataSource(sourceNode));
      }
      if (isRecord(pageNode.Actions)) {
        const actionContainer = pageNode.Actions as XmlElement;
        const actions = ensureArray(actionContainer.Action as XmlElement | XmlElement[] | undefined);
        page.actions = actions.map((actionNode) => this.normalizeAction(actionNode));
      }
    }

    if (isRecord(root.Overlay)) {
      const overlayNode = root.Overlay as XmlElement;
      if (isRecord(overlayNode.Regions)) {
        const regions = ensureArray((overlayNode.Regions as XmlElement).Region as XmlElement | XmlElement[] | undefined);
        page.regions = regions.map((regionNode) => this.normalizeRegion(regionNode));
      }
      if (isRecord(overlayNode.Components)) {
        const components = ensureArray((overlayNode.Components as XmlElement).Component as XmlElement | XmlElement[] | undefined);
        page.components = components.map((componentNode) => this.normalizeComponent(componentNode));
      }
      if (isRecord(overlayNode.DataSources)) {
        const sources = ensureArray((overlayNode.DataSources as XmlElement).DataSource as XmlElement | XmlElement[] | undefined);
        page.dataSources = sources.map((sourceNode) => this.normalizeDataSource(sourceNode));
      }
      if (isRecord(overlayNode.Actions)) {
        const actions = ensureArray((overlayNode.Actions as XmlElement).Action as XmlElement | XmlElement[] | undefined);
        page.actions = actions.map((actionNode) => this.normalizeAction(actionNode));
      }
    }

    return {
      schemaVersion: String(schemaVersion),
      contentVersion: String(contentVersion),
      checksum: '',
      kind: kind === 'overlay' ? 'overlay' : 'blueprint',
      layer,
      page,
      sourcePath: path.relative(this.rootDir, filePath),
    };
  }

  private normalizeRegion(region: XmlElement): CanonicalRegion {
    const regionNode: CanonicalRegion = {
      id: String(region['@_id'] ?? ''),
      operation: parseOperation(region['@_operation']),
    };
    const components = ensureArray(region.Component as XmlElement | XmlElement[] | undefined);
    if (components.length > 0) {
      regionNode.components = components.map((component) => this.normalizeComponent(component));
    }
    return regionNode;
  }

  private normalizeComponent(component: XmlElement): CanonicalComponent {
    const node: CanonicalComponent = {
      id: String(component['@_id'] ?? ''),
      type: component['@_type'] ? String(component['@_type']) : undefined,
      namespace: component['@_namespace'] ? String(component['@_namespace']) : undefined,
      version: component['@_version'] ? String(component['@_version']) : undefined,
      operation: parseOperation(component['@_operation']),
    };

    if (isRecord(component.RBAC)) {
      node.rbac = this.normalizeRBAC(component.RBAC as XmlElement);
    }

    if (isRecord(component.Props)) {
      const propsElement = component.Props as XmlElement;
      const propEntries = ensureArray(propsElement.Prop as XmlElement | XmlElement[] | undefined);
      if (propEntries.length > 0) {
        node.props = {};
        for (const prop of propEntries) {
          const name = String(prop['@_name']);
          node.props[name] = this.normalizeProp(prop);
        }
      }
    }

    if (isRecord(component.Children)) {
      const childElement = component.Children as XmlElement;
      const children = ensureArray(childElement.Component as XmlElement | XmlElement[] | undefined);
      if (children.length > 0) {
        node.children = children.map((child) => this.normalizeComponent(child));
      }
    }

    return node;
  }

  private normalizeProp(prop: XmlElement): PropValue {
    const kind = prop['@_kind'];
    const formatAttr = typeof prop['@_format'] === 'string' ? prop['@_format'] : undefined;
    switch (kind) {
      case 'binding': {
        const source = String(prop['@_source'] ?? '');
        const binding: PropValue = {
          kind: 'binding',
          source,
          path: prop['@_path'] ? String(prop['@_path']) : null,
        };
        if (prop['@_fallback']) {
          binding.fallback = parseScalar(String(prop['@_fallback']), formatAttr);
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
        return { kind: 'static', value: parseScalar(value ?? '', formatAttr) };
      }
    }
  }

  private normalizeDataSource(source: XmlElement): CanonicalDataSource {
    const node: CanonicalDataSource = {
      id: String(source['@_id'] ?? ''),
      kind: (source['@_kind'] ?? 'static') as CanonicalDataSource['kind'],
      operation: parseOperation(source['@_operation']),
    };
    if (isRecord(source.RBAC)) {
      node.rbac = this.normalizeRBAC(source.RBAC as XmlElement);
    }
    if (source.Json) {
      const value = typeof source.Json === 'string' ? source.Json : extractNodeValue(source.Json as XmlElement);
      if (typeof value === 'string') {
        node.config = {
          ...(node.config ?? {}),
          value: JSON.parse(value.trim()),
        };
      }
    }
    if (isRecord(source.Config)) {
      node.config = {
        ...(node.config ?? {}),
        ...this.normalizeConfig(source.Config as XmlElement),
      };
    }
    return node;
  }

  private normalizeAction(action: XmlElement): CanonicalAction {
    const node: CanonicalAction = {
      id: String(action['@_id'] ?? ''),
      kind: String(action['@_kind'] ?? ''),
      operation: parseOperation(action['@_operation']),
    };
    if (isRecord(action.RBAC)) {
      node.rbac = this.normalizeRBAC(action.RBAC as XmlElement);
    }
    if (isRecord(action.Config)) {
      node.config = this.normalizeConfig(action.Config as XmlElement);
    }
    return node;
  }

  private normalizeRBAC(rbac: XmlElement): CanonicalRBAC {
    const allowRaw = rbac['@_allow'];
    const denyRaw = rbac['@_deny'];
    return {
      allow: allowRaw ? String(allowRaw).split(',').map((entry) => entry.trim()).filter(Boolean) : undefined,
      deny: denyRaw ? String(denyRaw).split(',').map((entry) => entry.trim()).filter(Boolean) : undefined,
    };
  }

  private normalizeConfig(node: XmlElement): Record<string, unknown> {
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
      entries[key] = this.normalizeConfigValue(value);
    }
    return entries;
  }

  private normalizeConfigValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.normalizeConfigValue(item));
    }
    if (value && typeof value === 'object') {
      const element = value as XmlElement;
      const nested = this.normalizeConfig(element);
      if (Object.keys(nested).length === 0 && typeof element['#text'] === 'string') {
        return element['#text'].trim();
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
}
