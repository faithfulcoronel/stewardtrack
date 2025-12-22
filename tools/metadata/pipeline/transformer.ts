import path from 'path';
import { XMLParser } from 'fast-xml-parser';
import {
  CanonicalAction,
  CanonicalComponent,
  CanonicalDataContract,
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

type ContractRegistry = Map<string, CanonicalDataContract>;

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
    const featureCode = root['@_featureCode'] ? String(root['@_featureCode']) : null;
    const requiredPermissions = root['@_requiredPermissions'] ? String(root['@_requiredPermissions']) : null;
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
      const contracts: ContractRegistry = new Map();
      if (isRecord(pageNode.DataSources)) {
        const sourceContainer = pageNode.DataSources as XmlElement;
        const sources = ensureArray(sourceContainer.DataSource as XmlElement | XmlElement[] | undefined);
        page.dataSources = sources.map((sourceNode) => {
          const dataSource = this.normalizeDataSource(sourceNode);
          if (dataSource.contract) {
            contracts.set(dataSource.id, dataSource.contract);
          }
          return dataSource;
        });
      }
      if (isRecord(pageNode.Regions)) {
        const regionContainer = pageNode.Regions as XmlElement;
        const regions = ensureArray(regionContainer.Region as XmlElement | XmlElement[] | undefined);
        page.regions = regions.map((regionNode) => this.normalizeRegion(regionNode, contracts));
      }
      if (isRecord(pageNode.Actions)) {
        const actionContainer = pageNode.Actions as XmlElement;
        const actions = ensureArray(actionContainer.Action as XmlElement | XmlElement[] | undefined);
        page.actions = actions.map((actionNode) => this.normalizeAction(actionNode));
      }
    }

    if (isRecord(root.Overlay)) {
      const overlayNode = root.Overlay as XmlElement;
      const overlayContracts: ContractRegistry = new Map(page.dataSources?.reduce((entries, source) => {
        if (source.contract) {
          entries.push([source.id, source.contract] as const);
        }
        return entries;
      }, [] as Array<readonly [string, CanonicalDataContract]>) ?? []);
      if (isRecord(overlayNode.DataSources)) {
        const sources = ensureArray((overlayNode.DataSources as XmlElement).DataSource as XmlElement | XmlElement[] | undefined);
        page.dataSources = sources.map((sourceNode) => {
          const dataSource = this.normalizeDataSource(sourceNode);
          if (dataSource.contract) {
            overlayContracts.set(dataSource.id, dataSource.contract);
          }
          return dataSource;
        });
      }
      if (isRecord(overlayNode.Regions)) {
        const regions = ensureArray((overlayNode.Regions as XmlElement).Region as XmlElement | XmlElement[] | undefined);
        page.regions = regions.map((regionNode) => this.normalizeRegion(regionNode, overlayContracts));
      }
      if (isRecord(overlayNode.Components)) {
        const components = ensureArray((overlayNode.Components as XmlElement).Component as XmlElement | XmlElement[] | undefined);
        page.components = components.map((componentNode) => this.normalizeComponent(componentNode, overlayContracts));
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
      featureCode,
      requiredPermissions,
    };
  }

  private normalizeRegion(region: XmlElement, contracts: ContractRegistry): CanonicalRegion {
    const regionNode: CanonicalRegion = {
      id: String(region['@_id'] ?? ''),
      operation: parseOperation(region['@_operation']),
    };
    const components = ensureArray(region.Component as XmlElement | XmlElement[] | undefined);
    if (components.length > 0) {
      regionNode.components = components.map((component) => this.normalizeComponent(component, contracts));
    }
    return regionNode;
  }

  private normalizeComponent(component: XmlElement, contracts: ContractRegistry): CanonicalComponent {
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
          node.props[name] = this.normalizeProp(prop, contracts);
        }
      }
    }

    if (isRecord(component.Children)) {
      const childElement = component.Children as XmlElement;
      const children = ensureArray(childElement.Component as XmlElement | XmlElement[] | undefined);
      if (children.length > 0) {
        node.children = children.map((child) => this.normalizeComponent(child, contracts));
      }
    }

    return node;
  }

  private normalizeProp(prop: XmlElement, contracts: ContractRegistry): PropValue {
    const kind = prop['@_kind'];
    const formatAttr = typeof prop['@_format'] === 'string' ? prop['@_format'] : undefined;
    switch (kind) {
      case 'binding': {
        const contractAlias = typeof prop['@_contract'] === 'string' ? prop['@_contract'].trim() : undefined;
        let source = String(prop['@_source'] ?? '');
        let path = prop['@_path'] ? String(prop['@_path']) : null;
        if (contractAlias) {
          const [contractSource, contractField] = contractAlias.split('.');
          if (!contractSource || !contractField) {
            throw new Error(`Invalid contract binding reference "${contractAlias}" on prop ${String(prop['@_name'])}`);
          }
          const contract = contracts.get(contractSource);
          if (!contract) {
            throw new Error(`Unknown data contract for source "${contractSource}" used by prop ${String(prop['@_name'])}`);
          }
          const field = contract.fields[contractField];
          if (!field) {
            throw new Error(
              `Unknown contract field "${contractField}" on source "${contractSource}" used by prop ${String(prop['@_name'])}`,
            );
          }
          source = contractSource;
          path = field.path;
        }
        const binding: PropValue = {
          kind: 'binding',
          source,
          path,
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
    if (isRecord(source.Contract)) {
      node.contract = this.normalizeContract(source.Contract as XmlElement);
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
    if (isRecord(source.Data)) {
      const payload = this.normalizeDataPayload(source.Data as XmlElement);
      node.config = {
        ...(node.config ?? {}),
        value: payload,
      };
    }
    return node;
  }

  private normalizeAction(action: XmlElement): CanonicalAction {
    const rawKind = String(action['@_kind'] ?? '');
    const node: CanonicalAction = {
      id: String(action['@_id'] ?? ''),
      kind: this.normalizeActionKind(rawKind),
      operation: parseOperation(action['@_operation']),
    };
    if (isRecord(action.RBAC)) {
      node.rbac = this.normalizeRBAC(action.RBAC as XmlElement);
    }
    if (isRecord(action.Config)) {
      node.config = this.normalizeActionConfig(action.Config as XmlElement);
    }
    return node;
  }

  /**
   * Normalize action kind to canonical runtime format.
   * XML authors may use shorthand 'service' which maps to 'metadata.service'.
   */
  private normalizeActionKind(kind: string): string {
    const kindMap: Record<string, string> = {
      'service': 'metadata.service',
      'metadata.service': 'metadata.service',
      'link': 'link',
      'modal': 'modal',
      'navigate': 'navigate',
    };
    return kindMap[kind] ?? kind;
  }

  /**
   * Normalize action config keys to camelCase for runtime consistency.
   * XML uses PascalCase (Handler, OnSuccess) but runtime expects camelCase (handler, onSuccess).
   */
  private normalizeActionConfig(node: XmlElement): Record<string, unknown> {
    const config = this.normalizeConfig(node);
    return this.normalizeConfigKeys(config);
  }

  /**
   * Recursively normalize config object keys to camelCase.
   */
  private normalizeConfigKeys(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const normalizedKey = this.toCamelCase(key);
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[normalizedKey] = this.normalizeConfigKeys(value as Record<string, unknown>);
      } else if (Array.isArray(value)) {
        result[normalizedKey] = value.map(item =>
          item && typeof item === 'object' && !Array.isArray(item)
            ? this.normalizeConfigKeys(item as Record<string, unknown>)
            : item
        );
      } else {
        result[normalizedKey] = value;
      }
    }
    return result;
  }

  /**
   * Convert PascalCase or other formats to camelCase.
   */
  private toCamelCase(str: string): string {
    if (!str || str.length === 0) return str;
    // If already camelCase or lowercase, return as-is
    if (str[0] === str[0].toLowerCase()) return str;
    // Convert first character to lowercase
    return str[0].toLowerCase() + str.slice(1);
  }

  private normalizeContract(contract: XmlElement): CanonicalDataContract {
    const fieldNodes = ensureArray(contract.Field as XmlElement | XmlElement[] | undefined);
    const fields: CanonicalDataContract['fields'] = {};
    for (const field of fieldNodes) {
      const nameAttr = field['@_name'];
      if (!nameAttr) {
        throw new Error('Contract <Field> entries must specify a name attribute.');
      }
      const name = String(nameAttr);
      const pathAttr = field['@_path'];
      const descriptionAttr = typeof field['@_description'] === 'string' ? field['@_description'].trim() : undefined;
      let description = descriptionAttr;
      if (!description && field.Description) {
        description = extractNodeValue(field.Description as XmlElement) ?? undefined;
      }
      fields[name] = {
        name,
        path: pathAttr != null ? String(pathAttr) : null,
        description: description && description.length > 0 ? description : undefined,
      };
    }
    return { fields };
  }

  private normalizeDataPayload(node: XmlElement, scalarFormat?: string): unknown {
    const namedEntries: Record<string, unknown> = {};
    const unnamedValues: unknown[] = [];

    const fieldNodes = ensureArray(node.Field as XmlElement | XmlElement[] | undefined);
    for (const field of fieldNodes) {
      const [fieldName, fieldValue] = this.normalizeDataField(field, scalarFormat);
      namedEntries[fieldName] = fieldValue;
    }

    const objectNodes = ensureArray(node.Object as XmlElement | XmlElement[] | undefined);
    for (const objectNode of objectNodes) {
      const result = this.normalizeDataObject(objectNode, scalarFormat);
      if (result.name) {
        namedEntries[result.name] = result.value;
      } else {
        unnamedValues.push(result.value);
      }
    }

    const arrayNodes = ensureArray(node.Array as XmlElement | XmlElement[] | undefined);
    for (const arrayNode of arrayNodes) {
      const result = this.normalizeDataArray(arrayNode, scalarFormat);
      if (result.name) {
        namedEntries[result.name] = result.value;
      } else {
        unnamedValues.push(result.value);
      }
    }

    const valueNodes = ensureArray(node.Value as XmlElement | XmlElement[] | undefined);
    if (valueNodes.length > 0) {
      if (valueNodes.length === 1) {
        unnamedValues.push(this.normalizeDataScalar(valueNodes[0], scalarFormat));
      } else {
        unnamedValues.push(valueNodes.map((valueNode) => this.normalizeDataScalar(valueNode, scalarFormat)));
      }
    }

    const textValue = typeof node['#text'] === 'string' ? node['#text'].trim() : '';
    if (textValue) {
      unnamedValues.push(this.normalizeDataScalar(textValue, scalarFormat));
    }

    const hasNamedEntries = Object.keys(namedEntries).length > 0;
    if (hasNamedEntries && unnamedValues.length > 0) {
      throw new Error('Data payloads cannot mix named and unnamed values at the same level.');
    }
    if (hasNamedEntries) {
      return namedEntries;
    }
    if (unnamedValues.length === 1) {
      return unnamedValues[0];
    }
    if (unnamedValues.length > 1) {
      return unnamedValues;
    }
    return {};
  }

  private normalizeDataObject(node: XmlElement, scalarFormat?: string): { name?: string; value: Record<string, unknown> } {
    const name = node['@_name'] ? String(node['@_name']) : undefined;
    const payload = this.normalizeDataPayload(node, scalarFormat);
    if (payload == null) {
      return { name, value: {} };
    }
    if (typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('<Object> nodes must resolve to an object payload.');
    }
    return { name, value: payload as Record<string, unknown> };
  }

  private normalizeDataArray(node: XmlElement, scalarFormat?: string): { name?: string; value: unknown[] } {
    const name = node['@_name'] ? String(node['@_name']) : undefined;
    const values: unknown[] = [];

    const objectNodes = ensureArray(node.Object as XmlElement | XmlElement[] | undefined);
    for (const objectNode of objectNodes) {
      values.push(this.normalizeDataObject(objectNode, scalarFormat).value);
    }

    const fieldNodes = ensureArray(node.Field as XmlElement | XmlElement[] | undefined);
    for (const field of fieldNodes) {
      const [fieldName, fieldValue] = this.normalizeDataField(field, scalarFormat);
      values.push({ [fieldName]: fieldValue });
    }

    const arrayNodes = ensureArray(node.Array as XmlElement | XmlElement[] | undefined);
    for (const arrayNode of arrayNodes) {
      values.push(this.normalizeDataArray(arrayNode, scalarFormat).value);
    }

    const valueNodes = ensureArray(node.Value as XmlElement | XmlElement[] | undefined);
    for (const valueNode of valueNodes) {
      values.push(this.normalizeDataScalar(valueNode, scalarFormat));
    }

    const textValue = typeof node['#text'] === 'string' ? node['#text'].trim() : '';
    if (textValue) {
      values.push(this.normalizeDataScalar(textValue, scalarFormat));
    }

    return { name, value: values };
  }

  private normalizeDataField(field: XmlElement, inheritedFormat?: string): [string, unknown] {
    const nameAttr = field['@_name'];
    if (!nameAttr) {
      throw new Error('Data <Field> entries must specify a name attribute.');
    }
    const name = String(nameAttr);
    const formatAttr = typeof field['@_type'] === 'string' ? field['@_type'] : inheritedFormat;
    const fieldClone: XmlElement = { ...field };
    delete fieldClone['@_name'];
    delete fieldClone['@_type'];
    const payload = this.normalizeDataPayload(fieldClone, formatAttr);
    return [name, payload];
  }

  private normalizeDataScalar(value: XmlElement | string | null | undefined, formatAttr?: string): unknown {
    if (value == null) {
      return null;
    }
    if (typeof value === 'string') {
      return parseScalar(value, this.normalizeScalarFormat(formatAttr));
    }
    const element = value as XmlElement;
    const nestedFormat = typeof element['@_type'] === 'string' ? element['@_type'] : formatAttr;
    const text = extractNodeValue(element);
    return parseScalar(text, this.normalizeScalarFormat(nestedFormat));
  }

  private normalizeScalarFormat(format?: string): string | undefined {
    if (!format) {
      return undefined;
    }
    switch (format) {
      case 'string':
      case 'text':
        return 'text';
      case 'integer':
      case 'number':
        return 'number';
      case 'bool':
      case 'boolean':
        return 'boolean';
      case 'json':
        return 'json';
      default:
        return format;
    }
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
