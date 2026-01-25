import { BaseModel } from '@/models/base.model';

/**
 * Campaign types
 */
export type CampaignType = 'individual' | 'bulk' | 'scheduled' | 'recurring';

/**
 * Campaign status
 */
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled' | 'failed';

/**
 * Communication channel types
 */
export type CommunicationChannel = 'email' | 'sms' | 'facebook';

/**
 * Array of all available communication channels (for iteration/validation)
 */
export const COMMUNICATION_CHANNELS: readonly CommunicationChannel[] = ['email', 'sms', 'facebook'] as const;

/**
 * Channel filter type (includes 'all' option for UI filtering)
 */
export type CommunicationChannelFilter = CommunicationChannel | 'all';

/**
 * Channel selection type for components that need 'both' option
 */
export type CommunicationChannelSelection = CommunicationChannel | 'both';

/**
 * Recipient criteria for dynamic audience selection
 */
export interface RecipientCriteria {
  source: 'members' | 'families' | 'event_attendees' | 'ministry_groups' | 'custom_list' | 'manual';
  sourceId?: string;
  filters?: Record<string, unknown>;
  memberIds?: string[];
  familyIds?: string[];
  eventId?: string;
  ministryId?: string;
  customListId?: string;
  manualContacts?: Array<{ email?: string; phone?: string; name?: string }>;
}

/**
 * Communication campaign model
 */
export interface Campaign extends BaseModel {
  id: string;
  tenant_id: string;
  name: string;
  description?: string | null;
  campaign_type: CampaignType;
  status: CampaignStatus;
  channels: CommunicationChannel[];
  subject?: string | null;
  content_html?: string | null;
  content_text?: string | null;
  template_id?: string | null;
  recipient_criteria?: RecipientCriteria | null;
  scheduled_at?: string | null;
  sent_at?: string | null;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  opened_count: number;
  clicked_count: number;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  // Enriched fields
  created_by_name?: string;
  updated_by_name?: string;
  template?: CampaignTemplate | null;
}

/**
 * Campaign with template details
 */
export interface CampaignTemplate {
  id: string;
  name: string;
  category: string;
}

/**
 * Campaign with full details including recipients
 */
export interface CampaignWithDetails extends Campaign {
  recipients?: CampaignRecipientSummary[];
}

/**
 * Summary of campaign recipients
 */
export interface CampaignRecipientSummary {
  total: number;
  pending: number;
  sent: number;
  delivered: number;
  failed: number;
  opened: number;
  clicked: number;
}

/**
 * DTO for creating a campaign
 */
export interface CreateCampaignDto {
  name: string;
  description?: string;
  campaign_type: CampaignType;
  channels: CommunicationChannel[];
  subject?: string;
  content_html?: string;
  content_text?: string;
  template_id?: string;
  recipient_criteria?: RecipientCriteria;
  scheduled_at?: string;
}

/**
 * DTO for updating a campaign
 */
export interface UpdateCampaignDto {
  name?: string;
  description?: string;
  campaign_type?: CampaignType;
  status?: CampaignStatus;
  channels?: CommunicationChannel[];
  subject?: string;
  content_html?: string;
  content_text?: string;
  template_id?: string;
  recipient_criteria?: RecipientCriteria;
  scheduled_at?: string;
}

/**
 * Campaign statistics for dashboard
 */
export interface CampaignStats {
  totalCampaigns: number;
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  deliveryRate: number;
  openRate: number;
  activeCampaigns: number;
  draftCampaigns: number;
}

/**
 * Campaign activity for timeline
 */
export interface CampaignActivity {
  id: string;
  campaignId: string;
  campaignName: string;
  action: 'created' | 'sent' | 'scheduled' | 'completed' | 'failed';
  timestamp: string;
  details?: string;
}
