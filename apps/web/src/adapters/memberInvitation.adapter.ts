import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from '@/adapters/base.adapter';
import type { AuditService } from '@/services/AuditService';
import type { EncryptionService } from '@/lib/encryption/EncryptionService';
import { TYPES } from '@/lib/types';
import { getFieldEncryptionConfig } from '@/utils/encryptionUtils';
import {
  MemberInvitation,
  MemberInvitationWithMember,
  CreateMemberInvitationDto,
  InvitationStats,
  EmailDeliveryStatus,
  MemberInvitationStatus
} from '@/models/memberInvitation.model';

export interface IMemberInvitationAdapter extends IBaseAdapter<MemberInvitation> {
  createInvitation(
    data: CreateMemberInvitationDto,
    tenantId: string,
    invitedBy: string
  ): Promise<{ success: boolean; invitation?: MemberInvitation; error?: string; error_code?: string }>;

  getInvitationByToken(token: string): Promise<MemberInvitationWithMember | null>;

  getInvitations(
    tenantId: string,
    limit?: number,
    offset?: number,
    filters?: {
      status?: MemberInvitationStatus;
      member_id?: string;
      invited_by?: string;
      date_from?: string;
      date_to?: string;
    }
  ): Promise<MemberInvitationWithMember[]>;

  acceptInvitation(
    token: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; error?: string; error_code?: string; member_id?: string; tenant_id?: string }>;

  revokeInvitation(
    id: string,
    revokedBy: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string; error_code?: string }>;

  resendInvitation(id: string, tenantId: string, userId: string): Promise<MemberInvitation>;

  getInvitationStats(tenantId: string): Promise<InvitationStats>;

  markExpiredInvitations(tenantId: string): Promise<number>;

  updateEmailDeliveryStatus(invitationId: string, status: EmailDeliveryStatus): Promise<void>;

  sendReminder(id: string, tenantId: string): Promise<MemberInvitation>;
}

/**
 * MemberInvitation Adapter with built-in encryption for PII fields
 *
 * Encrypted Fields (2 total):
 * - email (invitation recipient email)
 * - notes (free-form notes that may contain PII)
 *
 * Security Features:
 * - Transparent encryption/decryption in adapter layer
 * - Per-tenant encryption keys
 * - Field-level encryption with AES-256-GCM
 * - Audit logging of operations
 */
@injectable()
export class MemberInvitationAdapter
  extends BaseAdapter<MemberInvitation>
  implements IMemberInvitationAdapter
{
  constructor(
    @inject(TYPES.AuditService) private auditService: AuditService,
    @inject(TYPES.EncryptionService) private encryptionService: EncryptionService
  ) {
    super();
  }

  protected tableName = 'member_invitations';

  protected defaultSelect = `
    id,
    tenant_id,
    member_id,
    email,
    token,
    invitation_type,
    status,
    invited_at,
    invited_by,
    accepted_at,
    accepted_by,
    revoked_at,
    revoked_by,
    revocation_reason,
    expires_at,
    email_sent_at,
    email_delivered_at,
    email_opened_at,
    email_clicked_at,
    reminder_count,
    last_reminder_at,
    notes,
    metadata,
    encrypted_fields,
    encryption_key_version,
    assigned_role_id,
    created_at,
    updated_at,
    created_by,
    updated_by
  `;

  /**
   * Get PII field configuration for member_invitations table
   */
  private getPIIFields() {
    return getFieldEncryptionConfig('member_invitations');
  }

  protected override async onBeforeCreate(data: Partial<MemberInvitation>): Promise<Partial<MemberInvitation>> {
    // Encrypt PII fields before creating record
    const tenantId = this.context?.tenantId;
    if (!tenantId) {
      throw new Error('[MemberInvitationAdapter] Tenant context required for encryption');
    }

    try {
      const encrypted = await this.encryptionService.encryptFields(
        data,
        tenantId,
        this.getPIIFields()
      );

      // Track which fields are encrypted
      encrypted.encrypted_fields = this.getPIIFields().map(f => f.fieldName);
      encrypted.encryption_key_version = 1;

      console.log(
        `[MemberInvitationAdapter] Encrypted ${encrypted.encrypted_fields.length} PII fields for new invitation`
      );

      return encrypted;
    } catch (error) {
      console.error('[MemberInvitationAdapter] Encryption failed during create:', error);
      throw new Error(
        `Failed to encrypt invitation data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  protected override async onAfterCreate(data: MemberInvitation): Promise<void> {
    // Decrypt invitation data before logging to audit (so audit logs show readable values)
    const tenantId = this.context?.tenantId;
    if (!tenantId) {
      await this.auditService.logAuditEvent('create', 'member_invitation', data.id, data);
      return;
    }

    try {
      if (!data.encrypted_fields || (data.encrypted_fields as any[]).length === 0) {
        await this.auditService.logAuditEvent('create', 'member_invitation', data.id, data);
        return;
      }

      const decrypted = await this.encryptionService.decryptFields(
        data,
        tenantId,
        this.getPIIFields()
      );

      await this.auditService.logAuditEvent('create', 'member_invitation', data.id, decrypted);
    } catch (error) {
      console.error('[MemberInvitationAdapter] Failed to decrypt for audit logging:', error);
      await this.auditService.logAuditEvent('create', 'member_invitation', data.id, data);
    }
  }

  protected override async onBeforeUpdate(id: string, data: Partial<MemberInvitation>): Promise<Partial<MemberInvitation>> {
    // Encrypt PII fields before updating record
    const tenantId = this.context?.tenantId;
    if (!tenantId) {
      throw new Error('[MemberInvitationAdapter] Tenant context required for encryption');
    }

    try {
      const fieldsToEncrypt = this.getPIIFields().filter(
        field => data[field.fieldName as keyof MemberInvitation] !== undefined
      );

      if (fieldsToEncrypt.length === 0) {
        return data;
      }

      const encrypted = await this.encryptionService.encryptFields(
        data,
        tenantId,
        fieldsToEncrypt
      );

      encrypted.encrypted_fields = this.getPIIFields().map(f => f.fieldName);
      encrypted.encryption_key_version = 1;

      console.log(
        `[MemberInvitationAdapter] Encrypted ${fieldsToEncrypt.length} PII fields for invitation ${id}`
      );

      return encrypted;
    } catch (error) {
      console.error('[MemberInvitationAdapter] Encryption failed during update:', error);
      throw new Error(
        `Failed to encrypt invitation data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  protected override async onAfterUpdate(data: MemberInvitation): Promise<void> {
    // Decrypt invitation data before logging to audit (so audit logs show readable values)
    const tenantId = this.context?.tenantId;
    if (!tenantId) {
      await this.auditService.logAuditEvent('update', 'member_invitation', data.id, data);
      return;
    }

    try {
      if (!data.encrypted_fields || (data.encrypted_fields as any[]).length === 0) {
        await this.auditService.logAuditEvent('update', 'member_invitation', data.id, data);
        return;
      }

      const decrypted = await this.encryptionService.decryptFields(
        data,
        tenantId,
        this.getPIIFields()
      );

      await this.auditService.logAuditEvent('update', 'member_invitation', data.id, decrypted);
    } catch (error) {
      console.error('[MemberInvitationAdapter] Failed to decrypt for audit logging:', error);
      await this.auditService.logAuditEvent('update', 'member_invitation', data.id, data);
    }
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'member_invitation', id, { id });
  }

  /**
   * Decrypt PII fields after fetching invitations
   */
  public override async fetch(
    options: QueryOptions = {}
  ): Promise<{ data: MemberInvitation[]; count: number | null }> {
    const result = await super.fetch(options);
    const tenantId = this.context?.tenantId;

    if (!tenantId || !result.data.length) {
      return result;
    }

    try {
      const decrypted = await Promise.all(
        result.data.map(async (record) => {
          if (!record.encrypted_fields || (record.encrypted_fields as any[]).length === 0) {
            return record;
          }
          return await this.encryptionService.decryptFields(
            record,
            tenantId,
            this.getPIIFields()
          );
        })
      );

      console.log(
        `[MemberInvitationAdapter] Decrypted ${decrypted.length} invitation records`
      );

      return { data: decrypted, count: result.count };
    } catch (error) {
      console.error('[MemberInvitationAdapter] Decryption failed during fetch:', error);
      return result;
    }
  }

  /**
   * Decrypt PII fields after fetching single invitation
   */
  public override async fetchById(
    id: string,
    options: Omit<QueryOptions, 'pagination'> = {}
  ): Promise<MemberInvitation | null> {
    const record = await super.fetchById(id, options);

    if (!record) {
      return null;
    }

    const tenantId = this.context?.tenantId;
    if (!tenantId) {
      return record;
    }

    try {
      if (!record.encrypted_fields || (record.encrypted_fields as any[]).length === 0) {
        return record;
      }

      const decrypted = await this.encryptionService.decryptFields(
        record,
        tenantId,
        this.getPIIFields()
      );

      console.log(
        `[MemberInvitationAdapter] Decrypted invitation ${id}`
      );

      return decrypted;
    } catch (error) {
      console.error(`[MemberInvitationAdapter] Decryption failed for invitation ${id}:`, error);
      return record;
    }
  }

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
    const invitation = await this.fetchById(response.invitation_id);

    return {
      success: true,
      invitation: invitation!
    };
  }

  async getInvitationByToken(token: string): Promise<MemberInvitationWithMember | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
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
        ),
        assigned_role:assigned_role_id (
          id,
          name,
          description
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
      ...data,
      member: data.member,
      assigned_role: data.assigned_role
    } as MemberInvitationWithMember;
  }

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
      .from(this.tableName)
      .select(`
        *,
        member:member_id (
          id,
          first_name,
          last_name,
          email
        ),
        assigned_role:assigned_role_id (
          id,
          name,
          description
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
      ...item,
      member: item.member,
      assigned_role: item.assigned_role
    })) as MemberInvitationWithMember[];
  }

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

  async revokeInvitation(
    id: string,
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

  async resendInvitation(id: string, tenantId: string, userId: string): Promise<MemberInvitation> {
    const supabase = await this.getSupabaseClient();

    // Generate new token
    const { data: tokenResult } = await supabase
      .rpc('generate_invitation_token');

    const newToken = tokenResult as string;

    const { data: result, error } = await supabase
      .from(this.tableName)
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

    return result;
  }

  async getInvitationStats(tenantId: string): Promise<InvitationStats> {
    const supabase = await this.getSupabaseClient();

    // Get counts by status
    const { data: statusCounts } = await supabase
      .from(this.tableName)
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
      .from(this.tableName)
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

  async markExpiredInvitations(tenantId: string): Promise<number> {
    const supabase = await this.getSupabaseClient();

    const { count } = await supabase
      .from(this.tableName)
      .update({ status: 'expired' })
      .eq('tenant_id', tenantId)
      .in('status', ['pending', 'sent'])
      .lt('expires_at', new Date().toISOString());

    return count || 0;
  }

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
      .from(this.tableName)
      .update(updateData)
      .eq('id', invitationId);

    if (error) {
      throw new Error(`Failed to update email delivery status: ${error.message}`);
    }
  }

  async sendReminder(id: string, tenantId: string): Promise<MemberInvitation> {
    const supabase = await this.getSupabaseClient();

    // First, get current reminder_count
    const { data: current } = await supabase
      .from(this.tableName)
      .select('reminder_count')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    const newReminderCount = (current?.reminder_count || 0) + 1;

    const { data: result, error } = await supabase
      .from(this.tableName)
      .update({
        reminder_count: newReminderCount,
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

    return result;
  }
}
