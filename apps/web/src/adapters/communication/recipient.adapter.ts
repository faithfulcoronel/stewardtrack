import 'server-only';
import 'reflect-metadata';
import { injectable } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import type {
  CampaignRecipient,
  CreateRecipientDto,
  UpdateRecipientStatusDto,
  RecipientStatus,
} from '@/models/communication/recipient.model';

/**
 * IRecipientAdapter - Database adapter interface for campaign recipients
 *
 * This adapter handles direct database operations for recipients in communication campaigns.
 * Implements tenant-scoped queries for recipient management and status tracking.
 *
 * @module communication.core
 *
 * Permission Requirements (enforced at API route level via PermissionGate):
 * - View operations (getRecipientsByCampaign, getRecipientById, getPendingRecipients, getRecipientCounts): `communication:view`
 * - Manage operations (createRecipient, createRecipients, updateRecipientStatus): `communication:manage`
 * - Delete operations (deleteRecipientsByCampaign): `communication:manage`
 *
 * @see {@link PermissionGate} for permission enforcement
 * @see {@link RecipientRepository} for the repository layer
 */
export type IRecipientAdapter = IBaseAdapter<CampaignRecipient> & {
  createRecipient(data: CreateRecipientDto, tenantId: string): Promise<CampaignRecipient>;
  createRecipients(data: CreateRecipientDto[], tenantId: string): Promise<CampaignRecipient[]>;
  updateRecipientStatus(id: string, data: UpdateRecipientStatusDto): Promise<CampaignRecipient>;
  getRecipientsByCampaign(campaignId: string, tenantId: string, filters?: RecipientFilters): Promise<CampaignRecipient[]>;
  getRecipientById(id: string, tenantId: string): Promise<CampaignRecipient | null>;
  getPendingRecipients(campaignId: string, limit?: number): Promise<CampaignRecipient[]>;
  getRecipientCounts(campaignId: string): Promise<RecipientCounts>;
  deleteRecipientsByCampaign(campaignId: string, tenantId: string): Promise<void>;
};

export interface RecipientFilters {
  status?: RecipientStatus;
  channel?: string;
  recipientType?: string;
}

export interface RecipientCounts {
  total: number;
  pending: number;
  sent: number;
  delivered: number;
  failed: number;
  bounced: number;
  opened: number;
  clicked: number;
}

@injectable()
export class RecipientAdapter extends BaseAdapter<CampaignRecipient> implements IRecipientAdapter {
  protected tableName = 'campaign_recipients';
  protected defaultSelect = `
    id, campaign_id, tenant_id, recipient_type, recipient_id, email, phone,
    personalization_data, status, channel, sent_at, delivered_at, opened_at,
    clicked_at, error_message, provider_message_id, created_at, updated_at
  `;

  async createRecipient(data: CreateRecipientDto, tenantId: string): Promise<CampaignRecipient> {
    const supabase = await this.getSupabaseClient();

    const { data: result, error } = await supabase
      .from(this.tableName)
      .insert({
        campaign_id: data.campaign_id,
        tenant_id: tenantId,
        recipient_type: data.recipient_type,
        recipient_id: data.recipient_id ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        personalization_data: data.personalization_data ?? null,
        status: 'pending',
        channel: data.channel,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select(this.defaultSelect)
      .single();

    if (error) {
      throw new Error(`Failed to create recipient: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to create recipient: missing response payload');
    }

    return this.enrichRecipient(result);
  }

  async createRecipients(data: CreateRecipientDto[], tenantId: string): Promise<CampaignRecipient[]> {
    console.log('[RecipientAdapter] createRecipients called with', data.length, 'records for tenant', tenantId);

    if (data.length === 0) {
      console.log('[RecipientAdapter] No recipients to create, returning empty array');
      return [];
    }

    const supabase = await this.getSupabaseClient();
    const now = new Date().toISOString();

    const records = data.map((d) => ({
      campaign_id: d.campaign_id,
      tenant_id: tenantId,
      recipient_type: d.recipient_type,
      recipient_id: d.recipient_id ?? null,
      email: d.email ?? null,
      phone: d.phone ?? null,
      personalization_data: d.personalization_data ?? null,
      status: 'pending',
      channel: d.channel,
      created_at: now,
      updated_at: now,
    }));

    console.log('[RecipientAdapter] Inserting records:', records.map(r => ({
      campaign_id: r.campaign_id,
      email: r.email,
      phone: r.phone,
      recipient_type: r.recipient_type,
      status: r.status,
    })));

    const { data: result, error } = await supabase
      .from(this.tableName)
      .insert(records)
      .select(this.defaultSelect);

    if (error) {
      console.error('[RecipientAdapter] Failed to insert recipients:', error.message);
      throw new Error(`Failed to create recipients: ${error.message}`);
    }

    console.log('[RecipientAdapter] Successfully created', (result || []).length, 'recipients');
    return this.enrichRecipientList(result || []);
  }

  async updateRecipientStatus(id: string, data: UpdateRecipientStatusDto): Promise<CampaignRecipient> {
    const supabase = await this.getSupabaseClient();

    const updateData: Record<string, unknown> = {
      status: data.status,
      updated_at: new Date().toISOString(),
    };

    if (data.sent_at !== undefined) updateData.sent_at = data.sent_at;
    if (data.delivered_at !== undefined) updateData.delivered_at = data.delivered_at;
    if (data.opened_at !== undefined) updateData.opened_at = data.opened_at;
    if (data.clicked_at !== undefined) updateData.clicked_at = data.clicked_at;
    if (data.error_message !== undefined) updateData.error_message = data.error_message;
    if (data.provider_message_id !== undefined) updateData.provider_message_id = data.provider_message_id;

    const { data: result, error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .select(this.defaultSelect)
      .single();

    if (error) {
      throw new Error(`Failed to update recipient status: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to update recipient status: record not found');
    }

    return this.enrichRecipient(result);
  }

  async getRecipientsByCampaign(
    campaignId: string,
    tenantId: string,
    filters?: RecipientFilters
  ): Promise<CampaignRecipient[]> {
    const supabase = await this.getSupabaseClient();

    let query = supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('campaign_id', campaignId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.channel) {
      query = query.eq('channel', filters.channel);
    }

    if (filters?.recipientType) {
      query = query.eq('recipient_type', filters.recipientType);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch recipients: ${error.message}`);
    }

    return this.enrichRecipientList(data || []);
  }

  async getRecipientById(id: string, tenantId: string): Promise<CampaignRecipient | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch recipient: ${error.message}`);
    }

    return this.enrichRecipient(data);
  }

  async getPendingRecipients(campaignId: string, limit: number = 100): Promise<CampaignRecipient[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('campaign_id', campaignId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch pending recipients: ${error.message}`);
    }

    return this.enrichRecipientList(data || []);
  }

  async getRecipientCounts(campaignId: string): Promise<RecipientCounts> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('status')
      .eq('campaign_id', campaignId);

    if (error) {
      throw new Error(`Failed to fetch recipient counts: ${error.message}`);
    }

    const recipients = (data as unknown as Array<{ status: string }>) || [];
    const counts: RecipientCounts = {
      total: recipients.length,
      pending: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      bounced: 0,
      opened: 0,
      clicked: 0,
    };

    for (const r of recipients) {
      switch (r.status) {
        case 'pending':
          counts.pending++;
          break;
        case 'sent':
          counts.sent++;
          break;
        case 'delivered':
          counts.delivered++;
          break;
        case 'failed':
          counts.failed++;
          break;
        case 'bounced':
          counts.bounced++;
          break;
        case 'opened':
          counts.opened++;
          break;
        case 'clicked':
          counts.clicked++;
          break;
      }
    }

    return counts;
  }

  async deleteRecipientsByCampaign(campaignId: string, tenantId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();

    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('campaign_id', campaignId)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to delete recipients: ${error.message}`);
    }
  }

  private enrichRecipient(data: unknown): CampaignRecipient {
    const row = data as Record<string, unknown>;
    return {
      ...row,
      personalization_data: row.personalization_data as CampaignRecipient['personalization_data'],
    } as CampaignRecipient;
  }

  private enrichRecipientList(data: unknown[]): CampaignRecipient[] {
    return data.map((row) => this.enrichRecipient(row));
  }
}
