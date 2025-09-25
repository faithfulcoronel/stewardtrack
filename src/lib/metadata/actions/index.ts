import type { MetadataActionHandler } from './types';
import { initializeMetadataModules } from '../modules';
import { resolveMetadataActionHandler as resolveFromModules } from '../modules/registry';

export * from './types';

export function resolveMetadataActionHandler(handlerId: string): MetadataActionHandler | undefined {
  initializeMetadataModules();
  return resolveFromModules(handlerId);
}
