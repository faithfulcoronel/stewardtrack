import { BaseModel } from './base.model';
import { Member } from './member.model';

export type MemberInvitationStatus = 'pending' | 'sent' | 'accepted' | 'expired' | 'revoked';
export type InvitationType = 'email' | 'manual';

export interface MemberInvitation extends BaseModel {
  tenant_id: string;
  member_id: string;
  email: string;
  invitation_type: InvitationType;
  status: MemberInvitationStatus;
  token: string;
  invited_by: string;
  invited_at: string;
  expires_at: string;
  accepted_at?: string;
  accepted_by?: string;
  revoked_at?: string;
  revoked_by?: string;
  revoke_reason?: string;
  email_sent_at?: string;
  email_delivered_at?: string;
  email_opened_at?: string;
  email_clicked_at?: string;
  reminder_count: number;
  last_reminder_at?: string;
  metadata: Record<string, unknown>;
  notes?: string;

  // Encryption fields
  encrypted_fields?: string[];
  encryption_key_version?: number;

  // Role pre-assignment for onboarding
  assigned_role_id?: string;

  // Relations
  member?: Member;
  assigned_role?: {
    id: string;
    name: string;
    description?: string;
  };
  invited_by_user?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  accepted_by_user?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

export interface CreateMemberInvitationDto {
  member_id: string;
  email: string;
  invitation_type?: InvitationType;
  expires_in_days?: number;
  notes?: string;
  /** Pre-assigned role ID for team member invitations during onboarding */
  assigned_role_id?: string;
}

export interface UpdateMemberInvitationDto {
  status?: MemberInvitationStatus;
  notes?: string;
  email_sent_at?: string;
  email_delivered_at?: string;
  email_opened_at?: string;
  email_clicked_at?: string;
  reminder_count?: number;
  last_reminder_at?: string;
  metadata?: Record<string, unknown>;
}

export interface MemberInvitationWithMember extends MemberInvitation {
  member: Member;
  assigned_role?: {
    id: string;
    name: string;
    description?: string;
  };
}

// For email workflow tracking
export interface EmailDeliveryStatus {
  invitation_id: string;
  status: 'queued' | 'sent' | 'delivered' | 'bounced' | 'failed';
  provider_message_id?: string;
  error_message?: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
}

// For invitation statistics
export interface InvitationStats {
  total_invitations: number;
  pending_invitations: number;
  sent_invitations: number;
  accepted_invitations: number;
  expired_invitations: number;
  revoked_invitations: number;
  acceptance_rate: number;
  average_acceptance_time_days: number;
}

// For bulk invitation operations
export interface BulkInvitationRequest {
  member_ids: string[];
  invitation_type?: InvitationType;
  expires_in_days?: number;
  notes?: string;
  /** Pre-assigned role ID for team member invitations during onboarding */
  assigned_role_id?: string;
}

export interface BulkInvitationResult {
  successful_invitations: string[];
  failed_invitations: {
    member_id: string;
    error: string;
    error_code: string;
  }[];
  total_processed: number;
  success_count: number;
  failure_count: number;
}