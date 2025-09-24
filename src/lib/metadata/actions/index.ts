import { adminCommunityActionHandlers } from './admin-community';
import type { MetadataActionHandler } from './types';

const registry: Record<string, MetadataActionHandler> = {
  ...adminCommunityActionHandlers,
};

export * from './types';

export function resolveMetadataActionHandler(
  handlerId: string
): MetadataActionHandler | undefined {
  return registry[handlerId];
}
