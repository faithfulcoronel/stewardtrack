import { registerMetadataModule } from './registry';
import { coreComponentsManifest } from './core-components.manifest';
import { adminCommunityManifest } from './admin-community.manifest';
import { adminSettingsManifest } from './admin-settings.manifest';
import { superAdminSettingsManifest } from './super-admin-settings.manifest';

let initialized = false;

export function initializeMetadataModules(): void {
  if (initialized) {
    return;
  }
  [coreComponentsManifest, adminCommunityManifest, adminSettingsManifest, superAdminSettingsManifest].forEach((manifest) =>
    registerMetadataModule(manifest),
  );
  initialized = true;
}
