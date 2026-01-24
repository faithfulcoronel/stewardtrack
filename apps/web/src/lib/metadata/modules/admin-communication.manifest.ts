/**
 * Admin Communication Module - Metadata Module Manifest
 *
 * Registers all service handlers and action handlers for the communication module.
 */

import { adminCommunicationActionHandlers } from '../actions/admin-communication';
import { adminCommunicationHandlers } from '../services/admin-communication';
import type { MetadataModuleManifest } from './registry';

export const adminCommunicationManifest: MetadataModuleManifest = {
  id: 'admin-communication',
  actions: adminCommunicationActionHandlers,
  services: adminCommunicationHandlers,
};
