import React from 'react';
import semver from 'semver';

export type ComponentRenderer = (
  props: Record<string, unknown>,
  children: React.ReactNode,
) => React.ReactElement | null;

export interface ComponentDefinition {
  type: string;
  namespace: string;
  version: string;
  versionRange?: string;
  renderer: ComponentRenderer;
}

interface ResolvedComponent {
  renderer: ComponentRenderer;
  namespace: string;
  version: string;
  range: string;
}

export class ComponentRegistry {
  private readonly registry = new Map<string, ResolvedComponent>();
  private readonly indexByType = new Map<string, ResolvedComponent[]>();

  register(definition: ComponentDefinition): void {
    const key = this.computeKey(definition.namespace, definition.type);
    const range = definition.versionRange ?? `^${definition.version}`;
    const resolved: ResolvedComponent = {
      renderer: definition.renderer,
      namespace: definition.namespace,
      version: definition.version,
      range,
    };
    this.registry.set(key, resolved);
    const list = this.indexByType.get(definition.type) ?? [];
    const existingIndex = list.findIndex((entry) => entry.namespace === definition.namespace);
    if (existingIndex >= 0) {
      list[existingIndex] = resolved;
    } else {
      list.push(resolved);
    }
    this.indexByType.set(definition.type, list);
  }

  registerMany(definitions: ComponentDefinition[]): void {
    definitions.forEach((definition) => this.register(definition));
  }

  resolve(type: string, namespace?: string, version?: string): ComponentRenderer | null {
    let entry: ResolvedComponent | undefined;
    if (namespace) {
      entry = this.registry.get(this.computeKey(namespace, type));
    } else {
      const options = this.indexByType.get(type) ?? [];
      entry = options.length === 1 ? options[0] : undefined;
    }
    if (!entry) {
      return null;
    }
    if (version && semver.valid(version)) {
      if (!semver.satisfies(version, entry.range, { includePrerelease: true })) {
        console.warn(
          `Component ${namespace}:${type}@${version} does not satisfy registered range ${entry.range}.`,
        );
        return null;
      }
    }
    return entry.renderer;
  }

  private computeKey(namespace: string, type: string): string {
    return `${namespace}::${type}`;
  }
}

let sharedRegistry: ComponentRegistry | null = null;

export function getComponentRegistry(): ComponentRegistry {
  if (!sharedRegistry) {
    sharedRegistry = new ComponentRegistry();
  }
  return sharedRegistry;
}

export function resetComponentRegistry(): void {
  sharedRegistry = null;
}
