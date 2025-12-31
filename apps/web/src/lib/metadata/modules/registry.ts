import { ComponentDefinition, getComponentRegistry } from '../component-registry';
import type { MetadataActionHandler } from '../actions/types';
import type { ServiceDataSourceHandler } from '../services/types';

export interface MetadataModuleManifest {
  id: string;
  components?: ComponentDefinition[];
  actions?: Record<string, MetadataActionHandler>;
  services?: Record<string, ServiceDataSourceHandler>;
}

const actionHandlers = new Map<string, MetadataActionHandler>();
const serviceHandlers = new Map<string, ServiceDataSourceHandler>();
const registeredModules = new Set<string>();

export function registerMetadataModule(manifest: MetadataModuleManifest): void {
  if (registeredModules.has(manifest.id)) {
    return;
  }
  if (manifest.components?.length) {
    getComponentRegistry().registerMany(manifest.components);
  }
  if (manifest.actions) {
    for (const [key, handler] of Object.entries(manifest.actions)) {
      actionHandlers.set(key, handler);
    }
  }
  if (manifest.services) {
    for (const [key, handler] of Object.entries(manifest.services)) {
      serviceHandlers.set(key, handler);
    }
  }
  registeredModules.add(manifest.id);
}

export function resolveMetadataActionHandler(id: string): MetadataActionHandler | undefined {
  return actionHandlers.get(id);
}

export function resolveServiceDataSourceHandler(id: string): ServiceDataSourceHandler | undefined {
  return serviceHandlers.get(id);
}

export function listRegisteredModules(): string[] {
  return [...registeredModules];
}
