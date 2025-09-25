import { adminCommunityActionHandlers } from '../actions/admin-community';
import { adminCommunityHandlers } from '../services/admin-community';
import type { MetadataModuleManifest } from './registry';

export const adminCommunityManifest: MetadataModuleManifest = {
  id: 'admin-community',
  actions: adminCommunityActionHandlers,
  services: adminCommunityHandlers,
};
