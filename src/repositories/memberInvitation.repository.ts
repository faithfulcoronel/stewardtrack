import { injectable } from 'inversify';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { BaseRepository } from './base.repository';
import {
  MemberInvitation,
  MemberInvitationWithMember,
  CreateMemberInvitationDto,
  UpdateMemberInvitationDto,
  InvitationStats,
  BulkInvitationRequest,
  BulkInvitationResult,
  EmailDeliveryStatus,
  MemberInvitationStatus
} from '@/models/memberInvitation.model';

@injectable()
export class MemberInvitationRepository extends BaseRepository {
  private supabaseClient: SupabaseClient | null = null;

  private async getSupabaseClient(): Promise<SupabaseClient> {
    if (!this.supabaseClient) {
      this.supabaseClient = await createSupabaseServerClient();
    }
    return this.supabaseClient;
  }

  // Create member invitation
  async createInvitation(
    data: CreateMemberInvitationDto,
    tenantId: string,
    invitedBy: string
  ): Promise<{ success: boolean; invitation?: MemberInvitation; error?: string; error_code?: string }> {
    const supabase = await this.getSupabaseClient();

    const { data: result, error } = await supabase
      .rpc('create_member_invitation', {
        p_tenant_id: tenantId,
        p_member_id: data.member_id,
        p_email: data.email,
        p_invitation_type: data.invitation_type || 'email',
        p_invited_by: invitedBy,
        p_expires_in_days: data.expires_in_days || 7,
        p_notes: data.notes
      });

    if (error) {
      throw new Error(`Failed to create invitation: ${error.message}`);
    }

    const response = result as any;

    if (!response.success) {
      return {
        success: false,
        error: response.error,
        error_code: response.error_code
      };
    }

    // Fetch the created invitation
    const invitation = await this.getInvitationById(response.invitation_id, tenantId);

    return {
      success: true,
      invitation: invitation!
    };
  }

  // Get invitation by ID
  async getInvitationById(id: string, tenantId: string): Promise<MemberInvitation | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from('member_invitations')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch invitation: ${error.message}`);
    }

    return this.mapInvitationData(data);
  }

  // Get invitation by token
  async getInvitationByToken(token: string): Promise<MemberInvitationWithMember | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from('member_invitations')
      .select(`
        *,
        member:member_id (
          id,
          first_name,
          last_name,
          email
        ),
        invited_by_user:invited_by (
          id,
          email,
          raw_user_meta_data
        )
      `)
      .eq('token', token)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch invitation by token: ${error.message}`);
    }

    return {
      ...this.mapInvitationData(data),
      member: data.member
    } as MemberInvitationWithMember;
  }

  // Get invitations for a tenant
  async getInvitations(
    tenantId: string,
    limit = 50,
    offset = 0,
    filters?: {
      status?: MemberInvitationStatus;
      member_id?: string;
      invited_by?: string;
      date_from?: string;
      date_to?: string;
    }
  ): Promise<MemberInvitationWithMember[]> {
    const supabase = await this.getSupabaseClient();

    let query = supabase
      .from('member_invitations')
      .select(`
        *,
        member:member_id (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('tenant_id', tenantId);

    // Apply filters
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.member_id) {
      query = query.eq('member_id', filters.member_id);
    }
    if (filters?.invited_by) {
      query = query.eq('invited_by', filters.invited_by);
    }
    if (filters?.date_from) {
      query = query.gte('invited_at', filters.date_from);
    }
    if (filters?.date_to) {
      query = query.lte('invited_at', filters.date_to);
    }

    const { data, error } = await query
      .order('invited_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch invitations: ${error.message}`);
    }

    return (data || []).map(item => ({
      ...this.mapInvitationData(item),
      member: item.member
    })) as MemberInvitationWithMember[];
  }

  // Update invitation
  async updateInvitation(
    id: string,
    data: UpdateMemberInvitationDto,
    tenantId: string,
    updatedBy: string
  ): Promise<MemberInvitation> {
    const supabase = await this.getSupabaseClient();

    const { data: result, error } = await supabase
      .from('member_invitations')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
        updated_by: updatedBy
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(`
        *,
      `)
      .single();

    if (error) {
      throw new Error(`Failed to update invitation: ${error.message}`);
    }

    return this.mapInvitationData(result);
  }

  // Accept invitation
  async acceptInvitation(
    token: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; error?: string; error_code?: string; member_id?: string; tenant_id?: string }> {
    const supabase = await this.getSupabaseClient();

    const { data: result, error } = await supabase
      .rpc('accept_member_invitation', {
        p_token: token,
        p_user_id: userId,
        p_ip_address: ipAddress,
        p_user_agent: userAgent
      });

    if (error) {
      throw new Error(`Failed to accept invitation: ${error.message}`);
    }

    return result as any;
  }

  // Revoke invitation
  async revokeInvitation(
    id: string,
    tenantId: string,
    revokedBy: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string; error_code?: string }> {
    const supabase = await this.getSupabaseClient();

    const { data: result, error } = await supabase
      .rpc('revoke_member_invitation', {
        p_invitation_id: id,
        p_revoked_by: revokedBy,
        p_reason: reason
      });

    if (error) {
      throw new Error(`Failed to revoke invitation: ${error.message}`);
    }

    return result as any;
  }

  // Resend invitation
  async resendInvitation(id: string, tenantId: string, userId: string): Promise<MemberInvitation> {
    const supabase = await this.getSupabaseClient();

    // Generate new token and update status
    const { data: tokenResult } = await supabase
      .rpc('generate_invitation_token');

    const newToken = tokenResult as string;

    const { data: result, error } = await supabase
      .from('member_invitations')
      .update({
        token: newToken,
        status: 'pending',
        email_sent_at: null,
        email_delivered_at: null,
        email_opened_at: null,
        email_clicked_at: null,
        reminder_count: 0,
        last_reminder_at: null,
        updated_at: new Date().toISOString(),
        updated_by: userId
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(`
        *,
        invited_by_user:invited_by (
          id,
          email,
          raw_user_meta_data
        )
      `)
      .single();

    if (error) {
      throw new Error(`Failed to resend invitation: ${error.message}`);
    }

    return this.mapInvitationData(result);
  }

  // Bulk create invitations
  async bulkCreateInvitations(
    request: BulkInvitationRequest,
    tenantId: string,
    invitedBy: string
  ): Promise<BulkInvitationResult> {
    const successful_invitations: string[] = [];
    const failed_invitations: BulkInvitationResult['failed_invitations'] = [];

    for (const memberId of request.member_ids) {
      try {
        // Get member email first
        const supabase = await this.getSupabaseClient();
        const { data: member } = await supabase
          .from('members')
          .select('email')
          .eq('id', memberId)
          .eq('tenant_id', tenantId)
          .single();

        if (!member?.email) {
          failed_invitations.push({
            member_id: memberId,
            error: 'Member has no email address',
            error_code: 'NO_EMAIL'
          });
          continue;
        }

        const result = await this.createInvitation(
          {
            member_id: memberId,
            email: member.email,
            invitation_type: request.invitation_type,
            expires_in_days: request.expires_in_days,
            notes: request.notes
          },
          tenantId,
          invitedBy
        );

        if (result.success) {
          successful_invitations.push(memberId);
        } else {
          failed_invitations.push({
            member_id: memberId,
            error: result.error || 'Unknown error',
            error_code: result.error_code || 'UNKNOWN_ERROR'
          });
        }
      } catch (error) {
        failed_invitations.push({
          member_id: memberId,
          error: error instanceof Error ? error.message : 'Unknown error',
          error_code: 'EXCEPTION'
        });
      }
    }

    return {
      successful_invitations,
      failed_invitations,
      total_processed: request.member_ids.length,
      success_count: successful_invitations.length,
      failure_count: failed_invitations.length
    };
  }

  // Get invitation statistics
  async getInvitationStats(tenantId: string): Promise<InvitationStats> {
    const supabase = await this.getSupabaseClient();

    // Get counts by status
    const { data: statusCounts } = await supabase
      .from('member_invitations')
      .select('status')
      .eq('tenant_id', tenantId);

    const counts = {
      total_invitations: statusCounts?.length || 0,
      pending_invitations: 0,
      sent_invitations: 0,
      accepted_invitations: 0,
      expired_invitations: 0,
      revoked_invitations: 0
    };

    statusCounts?.forEach(item => {
      switch (item.status) {
        case 'pending':
          counts.pending_invitations++;
          break;
        case 'sent':
          counts.sent_invitations++;
          break;
        case 'accepted':
          counts.accepted_invitations++;
          break;
        case 'expired':
          counts.expired_invitations++;
          break;
        case 'revoked':
          counts.revoked_invitations++;
          break;
      }
    });

    // Calculate acceptance rate
    const totalSentOrAccepted = counts.sent_invitations + counts.accepted_invitations;
    const acceptance_rate = totalSentOrAccepted > 0
      ? Math.round((counts.accepted_invitations / totalSentOrAccepted) * 100)
      : 0;

    // Calculate average acceptance time
    const { data: acceptedInvitations } = await supabase
      .from('member_invitations')
      .select('invited_at, accepted_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'accepted')
      .not('accepted_at', 'is', null);

    let average_acceptance_time_days = 0;
    if (acceptedInvitations?.length) {
      const totalDays = acceptedInvitations.reduce((sum, inv) => {
        const invitedAt = new Date(inv.invited_at);
        const acceptedAt = new Date(inv.accepted_at);
        const diffDays = Math.abs(acceptedAt.getTime() - invitedAt.getTime()) / (1000 * 60 * 60 * 24);
        return sum + diffDays;
      }, 0);
      average_acceptance_time_days = Math.round(totalDays / acceptedInvitations.length);
    }

    return {
      ...counts,
      acceptance_rate,
      average_acceptance_time_days
    };
  }

  // Mark invitation as expired
  async markExpiredInvitations(tenantId: string): Promise<number> {
    const supabase = await this.getSupabaseClient();

    const { count } = await supabase
      .from('member_invitations')
      .update({ status: 'expired' })
      .eq('tenant_id', tenantId)
      .in('status', ['pending', 'sent'])
      .lt('expires_at', new Date().toISOString());

    return count || 0;
  }

  // Update email delivery status
  async updateEmailDeliveryStatus(
    invitationId: string,
    status: EmailDeliveryStatus
  ): Promise<void> {
    const supabase = await this.getSupabaseClient();

    const updateData: any = {};

    switch (status.status) {
      case 'sent':
        updateData.email_sent_at = status.delivered_at || new Date().toISOString();
        updateData.status = 'sent';
        break;
      case 'delivered':
        updateData.email_delivered_at = status.delivered_at;
        break;
      case 'bounced':
      case 'failed':
        updateData.metadata = {
          email_error: status.error_message,
          provider_message_id: status.provider_message_id
        };
        break;
    }

    if (status.opened_at) {
      updateData.email_opened_at = status.opened_at;
    }

    if (status.clicked_at) {
      updateData.email_clicked_at = status.clicked_at;
    }

    const { error } = await supabase
      .from('member_invitations')
      .update(updateData)
      .eq('id', invitationId);

    if (error) {
      throw new Error(`Failed to update email delivery status: ${error.message}`);
    }
  }

  // Get pending invitations for email sending
  async getPendingInvitations(tenantId: string, limit = 50): Promise<MemberInvitationWithMember[]> {
    return this.getInvitations(tenantId, limit, 0, { status: 'pending' });
  }

  // Send reminder for invitation
  async sendReminder(id: string, tenantId: string): Promise<MemberInvitation> {
    const supabase = await this.getSupabaseClient();

    const { data: result, error } = await supabase
      .from('member_invitations')
      .update({
        reminder_count: supabase.raw('reminder_count + 1'),
        last_reminder_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(`
        *,
        invited_by_user:invited_by (
          id,
          email,
          raw_user_meta_data
        )
      `)
      .single();

    if (error) {
      throw new Error(`Failed to send reminder: ${error.message}`);
    }

    return this.mapInvitationData(result);
  }

  private mapInvitationData(data: any): MemberInvitation {
    return {
      ...data,
      invited_by_user: data.invited_by ? {
        id: data.invited_by,
        email: data.invited_by, // Just use the invited_by field as email for now
        first_name: '',
        last_name: ''
      } : undefined,
      accepted_by_user: data.accepted_by ? {
        id: data.accepted_by,
        email: data.accepted_by, // Just use the accepted_by field as email for now
        first_name: '',
        last_name: ''
      } : undefined
    };
  }
}