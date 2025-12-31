import type { ServiceDataSourceHandler } from './types';
import { initializeMetadataModules } from '../modules';
import { resolveServiceDataSourceHandler as resolveFromModules } from '../modules/registry';

export type { ServiceDataSourceHandler, ServiceDataSourceRequest } from './types';

export function resolveServiceDataSourceHandler(handlerId: string): ServiceDataSourceHandler | undefined {
  initializeMetadataModules();
  return resolveFromModules(handlerId);
}
