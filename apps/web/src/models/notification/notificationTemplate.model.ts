/**
 * Notification Template Model
 *
 * Templates for rendering notification content per channel
 */

import type { BaseModel } from '@/models/base.model';
import type { DeliveryChannelType } from './notificationEvent.model';

/**
 * Template variable definition
 */
export interface TemplateVariable {
  name: string;
  description: string;
  required: boolean;
  defaultValue?: string;
}

/**
 * Notification template entity
 */
export interface NotificationTemplate extends BaseModel {
  id: string;
  tenant_id?: string; // NULL for system templates

  // Template identification
  event_type: string;
  channel: DeliveryChannelType;
  name: string;

  // Template content
  subject?: string; // For email
  title_template?: string; // For in-app/push
  body_template: string;

  // Template settings
  is_active: boolean;
  is_system: boolean;

  // Variable documentation
  variables: TemplateVariable[];

  // Timestamps
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

/**
 * DTO for creating a template
 */
export interface CreateNotificationTemplateDto {
  tenant_id?: string;
  event_type: string;
  channel: DeliveryChannelType;
  name: string;
  subject?: string;
  title_template?: string;
  body_template: string;
  variables?: TemplateVariable[];
}

/**
 * DTO for updating a template
 */
export interface UpdateNotificationTemplateDto {
  name?: string;
  subject?: string;
  title_template?: string;
  body_template?: string;
  is_active?: boolean;
  variables?: TemplateVariable[];
}

/**
 * Rendered template result
 */
export interface RenderedTemplate {
  subject?: string;
  title?: string;
  body: string;
  htmlBody?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Template rendering context
 */
export interface TemplateRenderContext {
  variables: Record<string, unknown>;
  tenantId?: string;
  channel: DeliveryChannelType;
}

/**
 * Template lookup key
 */
export interface TemplateLookupKey {
  eventType: string;
  channel: DeliveryChannelType;
  tenantId?: string;
}
