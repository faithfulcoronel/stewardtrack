/**
 * Admin Finance Module - Metadata Module Manifest
 *
 * Registers all service handlers and action handlers for the finance module.
 */

import { adminFinanceActionHandlers } from '../actions/admin-finance';
import { adminFinanceHandlers } from '../services/admin-finance';
import type { MetadataModuleManifest } from './registry';

export const adminFinanceManifest: MetadataModuleManifest = {
  id: 'admin-finance',
  actions: adminFinanceActionHandlers,
  services: adminFinanceHandlers,
};
