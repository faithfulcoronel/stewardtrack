import { BaseModel } from '@/models/base.model';

/**
 * Communication preferences model
 */
export interface CommunicationPreference extends BaseModel {
  id: string;
  tenant_id: string;
  member_id?: string | null;
  email?: string | null;
  phone?: string | null;
  email_opted_in: boolean;
  sms_opted_in: boolean;
  opted_out_at?: string | null;
  opted_out_reason?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * DTO for creating/updating communication preferences
 */
export interface UpsertPreferenceDto {
  member_id?: string;
  email?: string;
  phone?: string;
  email_opted_in?: boolean;
  sms_opted_in?: boolean;
  opted_out_reason?: string;
}

/**
 * Preference check result
 */
export interface PreferenceCheck {
  email?: string;
  phone?: string;
  emailOptedIn: boolean;
  smsOptedIn: boolean;
  canSendEmail: boolean;
  canSendSms: boolean;
}

/**
 * Opt-out request
 */
export interface OptOutRequest {
  email?: string;
  phone?: string;
  memberId?: string;
  channel: 'email' | 'sms' | 'all';
  reason?: string;
}
