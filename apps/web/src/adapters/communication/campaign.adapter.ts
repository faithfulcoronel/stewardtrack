import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { TYPES } from '@/lib/types';
import type { AuditService } from '@/services/AuditService';
import type {
  Campaign,
  CreateCampaignDto,
  UpdateCampaignDto,
  CampaignStats,
  CampaignActivity,
} from '@/models/communication/campaign.model';

/**
 * ICampaignAdapter - Database adapter interface for communication campaigns
 *
 * This adapter handles direct database operations for campaigns in the communication module.
 * Implements tenant-scoped queries and audit logging for all state changes.
 *
 * @module communication.core
 *
 * Permission Requirements (enforced at API route level via PermissionGate):
 * - View operations (getCampaigns, getCampaignById, getCampaignStats, getRecentActivity): `communication:view`
 * - Manage operations (createCampaign, updateCampaign, updateCampaignCounts): `communication:manage`
 * - Delete operations (deleteCampaign): `communication:delete`
 *
 * @see {@link PermissionGate} for permission enforcement
 * @see {@link CampaignRepository} for the repository layer
 */
export type ICampaignAdapter = IBaseAdapter<Campaign> & {
  createCampaign(data: CreateCampaignDto, tenantId: string): Promise<Campaign>;
  updateCampaign(id: string, data: UpdateCampaignDto, tenantId: string): Promise<Campaign>;
  deleteCampaign(id: string, tenantId: string): Promise<void>;
  getCampaigns(tenantId: string, filters?: CampaignFilters): Promise<Campaign[]>;
  getCampaignById(id: string, tenantId: string): Promise<Campaign | null>;
  getCampaignStats(tenantId: string, days?: number): Promise<CampaignStats>;
  getRecentActivity(tenantId: string, limit?: number): Promise<CampaignActivity[]>;
  updateCampaignCounts(id: string, counts: Partial<CampaignCounts>): Promise<void>;
};

export interface CampaignFilters {
  status?: string;
  campaignType?: string;
  channel?: string;
  startDate?: string;
  endDate?: string;
}

export interface CampaignCounts {
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  opened_count: number;
  clicked_count: number;
}

@injectable()
export class CampaignAdapter extends BaseAdapter<Campaign> implements ICampaignAdapter {
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'communication_campaigns';
  protected defaultSelect = `
    id, tenant_id, name, description, campaign_type, status, channels,
    subject, content_html, content_text, facebook_post_data, template_id, recipient_criteria,
    scheduled_at, sent_at, total_recipients, sent_count, delivered_count,
    failed_count, opened_count, clicked_count, created_by, created_at,
    updated_at, deleted_at
  `;

  protected override async onAfterCreate(data: Campaign): Promise<void> {
    await this.auditService.logAuditEvent('create', 'communication_campaign', data.id, data);
  }

  protected override async onAfterUpdate(data: Campaign): Promise<void> {
    await this.auditService.logAuditEvent('update', 'communication_campaign', data.id, data);
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'communication_campaign', id, { id });
  }

  async createCampaign(data: CreateCampaignDto, tenantId: string): Promise<Campaign> {
    const supabase = await this.getSupabaseClient();
    const userId = await this.getUserId();

    const { data: result, error } = await supabase
      .from(this.tableName)
      .insert({
        tenant_id: tenantId,
        name: data.name,
        description: data.description ?? null,
        campaign_type: data.campaign_type,
        status: 'draft',
        channels: data.channels,
        subject: data.subject ?? null,
        content_html: data.content_html ?? null,
        content_text: data.content_text ?? null,
        facebook_post_data: data.facebook_post_data ?? null,
        template_id: data.template_id ?? null,
        recipient_criteria: data.recipient_criteria ?? null,
        scheduled_at: data.scheduled_at ?? null,
        total_recipients: 0,
        sent_count: 0,
        delivered_count: 0,
        failed_count: 0,
        opened_count: 0,
        clicked_count: 0,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select(this.defaultSelect)
      .single();

    if (error) {
      throw new Error(`Failed to create campaign: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to create campaign: missing response payload');
    }

    const campaign = this.enrichCampaign(result);
    await this.onAfterCreate(campaign);
    return campaign;
  }

  async updateCampaign(id: string, data: UpdateCampaignDto, tenantId: string): Promise<Campaign> {
    const supabase = await this.getSupabaseClient();
    const userId = await this.getUserId();

    const updateData: Record<string, unknown> = {
      updated_by: userId,
      updated_at: new Date().toISOString(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.campaign_type !== undefined) updateData.campaign_type = data.campaign_type;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.channels !== undefined) updateData.channels = data.channels;
    if (data.subject !== undefined) updateData.subject = data.subject;
    if (data.content_html !== undefined) updateData.content_html = data.content_html;
    if (data.content_text !== undefined) updateData.content_text = data.content_text;
    if (data.facebook_post_data !== undefined) updateData.facebook_post_data = data.facebook_post_data;
    if (data.template_id !== undefined) updateData.template_id = data.template_id;
    if (data.recipient_criteria !== undefined) updateData.recipient_criteria = data.recipient_criteria;
    if (data.scheduled_at !== undefined) updateData.scheduled_at = data.scheduled_at;

    const { data: result, error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select(this.defaultSelect)
      .single();

    if (error) {
      throw new Error(`Failed to update campaign: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to update campaign: record not found');
    }

    const campaign = this.enrichCampaign(result);
    await this.onAfterUpdate(campaign);
    return campaign;
  }

  async deleteCampaign(id: string, tenantId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    const userId = await this.getUserId();

    const { error } = await supabase
      .from(this.tableName)
      .update({
        deleted_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to delete campaign: ${error.message}`);
    }

    await this.onAfterDelete(id);
  }

  async getCampaigns(tenantId: string, filters?: CampaignFilters): Promise<Campaign[]> {
    const supabase = await this.getSupabaseClient();

    let query = supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.campaignType) {
      query = query.eq('campaign_type', filters.campaignType);
    }

    if (filters?.channel) {
      query = query.contains('channels', [filters.channel]);
    }

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch campaigns: ${error.message}`);
    }

    return this.enrichCampaignList(data || []);
  }

  async getCampaignById(id: string, tenantId: string): Promise<Campaign | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(`
        ${this.defaultSelect},
        template:communication_templates(id, name, category)
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch campaign: ${error.message}`);
    }

    return this.enrichCampaign(data);
  }

  async getCampaignStats(tenantId: string, days: number = 30): Promise<CampaignStats> {
    const supabase = await this.getSupabaseClient();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from(this.tableName)
      .select('status, sent_count, delivered_count, opened_count')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .gte('created_at', startDate.toISOString());

    if (error) {
      throw new Error(`Failed to fetch campaign stats: ${error.message}`);
    }

    const campaigns = (data as unknown as Array<{
      status: string;
      sent_count: number;
      delivered_count: number;
      opened_count: number;
    }>) || [];

    const totalSent = campaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0);
    const totalDelivered = campaigns.reduce((sum, c) => sum + (c.delivered_count || 0), 0);
    const totalOpened = campaigns.reduce((sum, c) => sum + (c.opened_count || 0), 0);

    return {
      totalCampaigns: campaigns.length,
      totalSent,
      totalDelivered,
      totalOpened,
      deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
      openRate: totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0,
      activeCampaigns: campaigns.filter(c => c.status === 'sending' || c.status === 'scheduled').length,
      draftCampaigns: campaigns.filter(c => c.status === 'draft').length,
    };
  }

  async getRecentActivity(tenantId: string, limit: number = 10): Promise<CampaignActivity[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('id, name, status, sent_at, created_at, updated_at')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch recent activity: ${error.message}`);
    }

    return ((data as unknown as Array<{
      id: string;
      name: string;
      status: string;
      sent_at: string | null;
      created_at: string;
      updated_at: string;
    }>) || []).map((c) => {
      let action: CampaignActivity['action'] = 'created';
      let timestamp = c.created_at;

      if (c.status === 'sent' && c.sent_at) {
        action = 'completed';
        timestamp = c.sent_at;
      } else if (c.status === 'sending') {
        action = 'sent';
        timestamp = c.updated_at;
      } else if (c.status === 'scheduled') {
        action = 'scheduled';
        timestamp = c.updated_at;
      } else if (c.status === 'failed') {
        action = 'failed';
        timestamp = c.updated_at;
      }

      return {
        id: `activity-${c.id}`,
        campaignId: c.id,
        campaignName: c.name,
        action,
        timestamp,
      };
    });
  }

  async updateCampaignCounts(id: string, counts: Partial<CampaignCounts>): Promise<void> {
    const supabase = await this.getSupabaseClient();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (counts.total_recipients !== undefined) updateData.total_recipients = counts.total_recipients;
    if (counts.sent_count !== undefined) updateData.sent_count = counts.sent_count;
    if (counts.delivered_count !== undefined) updateData.delivered_count = counts.delivered_count;
    if (counts.failed_count !== undefined) updateData.failed_count = counts.failed_count;
    if (counts.opened_count !== undefined) updateData.opened_count = counts.opened_count;
    if (counts.clicked_count !== undefined) updateData.clicked_count = counts.clicked_count;

    const { error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update campaign counts: ${error.message}`);
    }
  }

  private enrichCampaign(data: unknown): Campaign {
    const row = data as Record<string, unknown>;
    return {
      ...row,
      channels: (row.channels as string[]) || ['email'],
      recipient_criteria: row.recipient_criteria as Campaign['recipient_criteria'],
      template: row.template as Campaign['template'],
    } as Campaign;
  }

  private enrichCampaignList(data: unknown[]): Campaign[] {
    return data.map((row) => this.enrichCampaign(row));
  }
}
