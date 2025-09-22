import { adminCommunityHandlers } from './admin-community';
import type { ServiceDataSourceHandler } from './types';

const registry: Record<string, ServiceDataSourceHandler> = {
  ...adminCommunityHandlers,
};

export type { ServiceDataSourceHandler, ServiceDataSourceRequest } from './types';

export function resolveServiceDataSourceHandler(
  handlerId: string
): ServiceDataSourceHandler | undefined {
  return registry[handlerId];
}
