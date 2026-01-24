import { registerMetadataModule } from './registry';
import { coreComponentsManifest } from './core-components.manifest';
import { adminCommunityManifest } from './admin-community.manifest';
import { adminCommunicationManifest } from './admin-communication.manifest';
import { adminSettingsManifest } from './admin-settings.manifest';
import { superAdminSettingsManifest } from './super-admin-settings.manifest';
import { adminFinanceManifest } from './admin-finance.manifest';

let initialized = false;

export function initializeMetadataModules(): void {
  if (initialized) {
    return;
  }
  [
    coreComponentsManifest,
    adminCommunityManifest,
    adminCommunicationManifest,
    adminSettingsManifest,
    superAdminSettingsManifest,
    adminFinanceManifest,
  ].forEach((manifest) => registerMetadataModule(manifest));
  initialized = true;
}
