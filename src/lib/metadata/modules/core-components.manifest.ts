import { adminComponentDefinitions } from '../components/admin';
import { marketingComponentDefinitions } from '../components/marketing';
import type { MetadataModuleManifest } from './registry';

export const coreComponentsManifest: MetadataModuleManifest = {
  id: 'core-components',
  components: [...marketingComponentDefinitions, ...adminComponentDefinitions],
};
