import { BaseModel } from '@/models/base.model';
import type { CommunicationChannel } from './campaign.model';

/**
 * Template categories
 */
export type TemplateCategory =
  | 'welcome'
  | 'event'
  | 'newsletter'
  | 'prayer'
  | 'announcement'
  | 'follow-up'
  | 'birthday'
  | 'anniversary'
  | 'custom';

/**
 * Template variable definition
 */
export interface TemplateVariable {
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
  description?: string;
}

/**
 * Communication template model
 */
export interface Template extends BaseModel {
  id: string;
  tenant_id: string;
  name: string;
  description?: string | null;
  category: TemplateCategory;
  channels: CommunicationChannel[];
  subject?: string | null;
  content_html?: string | null;
  content_text?: string | null;
  variables: TemplateVariable[];
  is_system: boolean;
  is_ai_generated: boolean;
  ai_prompt?: string | null;
  usage_count: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  // Enriched fields
  created_by_name?: string;
  updated_by_name?: string;
}

/**
 * DTO for creating a template
 */
export interface CreateTemplateDto {
  name: string;
  description?: string;
  category: TemplateCategory;
  channels: CommunicationChannel[];
  subject?: string;
  content_html?: string;
  content_text?: string;
  variables?: TemplateVariable[];
  is_ai_generated?: boolean;
  ai_prompt?: string;
}

/**
 * DTO for updating a template
 */
export interface UpdateTemplateDto {
  name?: string;
  description?: string;
  category?: TemplateCategory;
  channels?: CommunicationChannel[];
  subject?: string;
  content_html?: string;
  content_text?: string;
  variables?: TemplateVariable[];
}

/**
 * Template with usage statistics
 */
export interface TemplateWithStats extends Template {
  lastUsedAt?: string;
  campaignCount?: number;
}

/**
 * Grouped templates by category
 */
export interface TemplatesByCategory {
  category: TemplateCategory;
  templates: Template[];
}
