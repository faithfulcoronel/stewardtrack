import semver from 'semver';
import type {
  CanonicalAction,
  CanonicalComponent,
  CanonicalDataSource,
  CanonicalDefinition,
  CanonicalRegion,
} from './types';

interface BindingRef {
  sourceId: string;
  location: string;
}

export function validateCanonicalDefinition(definition: CanonicalDefinition, filePath: string): void {
  if (!semver.valid(definition.schemaVersion)) {
    throw new Error(`Invalid schemaVersion in ${filePath}. Use semantic versioning.`);
  }
  if (!semver.valid(definition.contentVersion)) {
    throw new Error(`Invalid contentVersion in ${filePath}. Use semantic versioning.`);
  }
  if (!definition.layer.module || !definition.layer.route) {
    throw new Error(`Missing module/route metadata in ${filePath}.`);
  }
  if (
    definition.kind === 'overlay' &&
    !definition.layer.tenant &&
    !definition.layer.role &&
    !definition.layer.variant &&
    !definition.layer.locale
  ) {
    throw new Error(`Overlay definitions must target a tenant, role, variant, or locale (${filePath}).`);
  }
  if (definition.kind === 'blueprint' && !definition.page.id) {
    throw new Error(`Blueprints must include a page id (${filePath}).`);
  }

  const componentIds = new Set<string>();
  const dataSourceIds = new Set<string>();
  const actionIds = new Set<string>();
  const pendingBindings: BindingRef[] = [];

  const inspectComponent = (component: CanonicalComponent, trail: string[]) => {
    const key = component.id;
    if (!key) {
      throw new Error(`Component missing id in ${filePath} (${trail.join(' > ') || 'root'})`);
    }
    const existing = componentIds.has(key);
    if (definition.kind === 'blueprint' && existing) {
      throw new Error(`Duplicate component id "${key}" found in ${filePath} at ${trail.join(' > ')}`);
    }
    componentIds.add(key);
    if (component.type && component.version && !semver.valid(component.version)) {
      throw new Error(
        `Component ${component.type} has invalid version "${component.version}" in ${filePath}. Use semantic versioning.`,
      );
    }
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

  const inspectRegion = (region: CanonicalRegion) => {
    if (definition.kind === 'blueprint') {
      if (!region.id) {
        throw new Error(`Region missing id in ${filePath}`);
      }
    }
    region.components?.forEach((component) => inspectComponent(component, [region.id, component.id]));
  };

  definition.page.regions?.forEach((region) => inspectRegion(region));
  definition.page.components?.forEach((component) => inspectComponent(component, [component.id]));

  const registerDataSource = (source: CanonicalDataSource) => {
    if (definition.kind === 'blueprint' && dataSourceIds.has(source.id)) {
      throw new Error(`Duplicate data source id "${source.id}" in ${filePath}.`);
    }
    dataSourceIds.add(source.id);
  };

  const registerAction = (action: CanonicalAction) => {
    if (definition.kind === 'blueprint' && actionIds.has(action.id)) {
      throw new Error(`Duplicate action id "${action.id}" in ${filePath}.`);
    }
    actionIds.add(action.id);
  };

  definition.page.dataSources?.forEach(registerDataSource);
  definition.page.actions?.forEach(registerAction);

  if (pendingBindings.length > 0) {
    const unresolved = pendingBindings.filter((binding) => !dataSourceIds.has(binding.sourceId));
    if (unresolved.length > 0) {
      const messages = unresolved
        .map((binding) => `Binding to unknown data source "${binding.sourceId}" at ${binding.location}`)
        .join('\n');
      throw new Error(`Detected unresolved data bindings in ${filePath}:\n${messages}`);
    }
  }
}
