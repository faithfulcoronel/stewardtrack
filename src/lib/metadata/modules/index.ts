import { registerMetadataModule } from './registry';
import { coreComponentsManifest } from './core-components.manifest';
import { adminCommunityManifest } from './admin-community.manifest';

let initialized = false;

export function initializeMetadataModules(): void {
  if (initialized) {
    return;
  }
  [coreComponentsManifest, adminCommunityManifest].forEach((manifest) => registerMetadataModule(manifest));
  initialized = true;
}
