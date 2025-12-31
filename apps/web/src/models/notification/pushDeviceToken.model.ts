/**
 * ================================================================================
 * PUSH DEVICE TOKEN MODEL
 * ================================================================================
 *
 * Domain model for FCM device tokens used for push notifications.
 * Supports web (browser), iOS, and Android devices.
 *
 * ================================================================================
 */

import type { BaseModel } from '@/models/base.model';

export type DeviceType = 'web' | 'ios' | 'android';

/**
 * Browser information for web device tokens
 */
export interface BrowserInfo {
  browser: string;
  os: string;
  version: string;
}

/**
 * Push device token entity (extends BaseModel for compatibility with BaseAdapter)
 */
export interface PushDeviceToken extends BaseModel {
  id: string;
  user_id: string;
  tenant_id: string;
  token: string;
  device_type: DeviceType;
  device_name: string | null;
  browser_info: BrowserInfo | null;
  is_active: boolean;
  last_used_at: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * DTO for creating a new device token
 */
export interface CreatePushDeviceTokenDto {
  token: string;
  device_type: DeviceType;
  device_name?: string;
  browser_info?: BrowserInfo;
}

/**
 * DTO for updating a device token
 */
export interface UpdatePushDeviceTokenDto {
  device_name?: string;
  browser_info?: BrowserInfo;
  is_active?: boolean;
}
