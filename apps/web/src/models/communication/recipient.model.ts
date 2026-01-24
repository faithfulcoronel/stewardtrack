import { BaseModel } from '@/models/base.model';
import type { CommunicationChannel } from './campaign.model';

/**
 * Recipient types
 */
export type RecipientType = 'member' | 'account' | 'external';

/**
 * Recipient delivery status
 */
export type RecipientStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'bounced'
  | 'opened'
  | 'clicked'
  | 'unsubscribed';

/**
 * Personalization data for recipient
 */
export interface PersonalizationData {
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  [key: string]: unknown;
}

/**
 * Campaign recipient model
 */
export interface CampaignRecipient extends BaseModel {
  id: string;
  campaign_id: string;
  tenant_id: string;
  recipient_type: RecipientType;
  recipient_id?: string | null;
  email?: string | null;
  phone?: string | null;
  personalization_data?: PersonalizationData | null;
  status: RecipientStatus;
  channel: CommunicationChannel;
  sent_at?: string | null;
  delivered_at?: string | null;
  opened_at?: string | null;
  clicked_at?: string | null;
  error_message?: string | null;
  provider_message_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * DTO for creating a campaign recipient
 */
export interface CreateRecipientDto {
  campaign_id: string;
  recipient_type: RecipientType;
  recipient_id?: string;
  email?: string;
  phone?: string;
  personalization_data?: PersonalizationData;
  channel: CommunicationChannel;
}

/**
 * DTO for updating recipient status
 */
export interface UpdateRecipientStatusDto {
  status: RecipientStatus;
  sent_at?: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
  error_message?: string;
  provider_message_id?: string;
}

/**
 * Recipient with member/account details
 */
export interface RecipientWithDetails extends CampaignRecipient {
  member?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
  };
}

/**
 * Resolved recipient for sending
 */
export interface ResolvedRecipient {
  id?: string;
  type: RecipientType;
  memberId?: string;
  accountId?: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  personalizationData: PersonalizationData;
}

/**
 * Recipient source for bulk selection
 */
export interface RecipientSource {
  type: 'members' | 'families' | 'event_attendees' | 'ministry_groups' | 'custom_list' | 'manual';
  id?: string;
  name: string;
  count: number;
  description?: string;
}
