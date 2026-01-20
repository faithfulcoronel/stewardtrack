import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, type QueryOptions } from '@/adapters/base.adapter';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';
import type {
  Campaign,
  CreateCampaignDto,
  UpdateCampaignDto,
  CampaignWithProgress,
  CampaignStatus,
} from '@/models/campaign.model';

/**
 * Interface for Campaign data access operations
 */
export interface ICampaignAdapter extends IBaseAdapter<Campaign> {
  createCampaign(data: CreateCampaignDto, tenantId: string): Promise<Campaign>;
  updateCampaign(id: string, data: UpdateCampaignDto, tenantId: string): Promise<Campaign>;
  updateCampaignStatus(id: string, status: CampaignStatus, tenantId: string): Promise<Campaign>;
  getCampaignWithProgress(id: string, tenantId: string): Promise<CampaignWithProgress | null>;
  getActiveCampaigns(tenantId: string): Promise<CampaignWithProgress[]>;
  refreshCampaignTotals(campaignId: string, tenantId: string): Promise<void>;
}

@injectable()
export class CampaignAdapter extends BaseAdapter<Campaign> implements ICampaignAdapter {
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'campaigns';

  protected defaultSelect = `
    id,
    tenant_id,
    name,
    description,
    goal_amount,
    fund_id,
    start_date,
    end_date,
    status,
    total_raised,
    donor_count,
    created_by,
    updated_by,
    created_at,
    updated_at
  `;

  protected defaultRelationships: QueryOptions['relationships'] = [
    {
      table: 'funds',
      foreignKey: 'fund_id',
      select: ['id', 'name', 'code'],
    },
  ];

  protected override async onAfterCreate(data: Campaign): Promise<void> {
    await this.auditService.logAuditEvent('create', 'campaign', data.id, {
      name: data.name,
      goal_amount: data.goal_amount,
    });
  }

  protected override async onAfterUpdate(data: Campaign): Promise<void> {
    await this.auditService.logAuditEvent('update', 'campaign', data.id, {
      name: data.name,
      status: data.status,
    });
  }

  /**
   * Create a new campaign
   */
  async createCampaign(data: CreateCampaignDto, tenantId: string): Promise<Campaign> {
    const supabase = await this.getSupabaseClient();
    const userId = await this.getUserId();

    const record = {
      tenant_id: tenantId,
      name: data.name,
      description: data.description || null,
      goal_amount: data.goal_amount || null,
      fund_id: data.fund_id || null,
      start_date: data.start_date,
      end_date: data.end_date || null,
      status: data.status || 'draft',
      total_raised: 0,
      donor_count: 0,
      created_by: userId,
      updated_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: result, error } = await supabase
      .from(this.tableName)
      .insert([record])
      .select(this.defaultSelect)
      .single();

    if (error) {
      throw new Error(`Failed to create campaign: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to create campaign: missing response payload');
    }

    await this.onAfterCreate(result as unknown as Campaign);

    return result as unknown as Campaign;
  }

  /**
   * Update a campaign
   */
  async updateCampaign(id: string, data: UpdateCampaignDto, tenantId: string): Promise<Campaign> {
    const supabase = await this.getSupabaseClient();
    const userId = await this.getUserId();

    const { data: result, error } = await supabase
      .from(this.tableName)
      .update({
        ...data,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(this.defaultSelect)
      .single();

    if (error) {
      throw new Error(`Failed to update campaign: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to update campaign: record not found');
    }

    await this.onAfterUpdate(result as unknown as Campaign);

    return result as unknown as Campaign;
  }

  /**
   * Update campaign status
   */
  async updateCampaignStatus(
    id: string,
    status: CampaignStatus,
    tenantId: string
  ): Promise<Campaign> {
    const supabase = await this.getSupabaseClient();
    const userId = await this.getUserId();

    const { data: result, error } = await supabase
      .from(this.tableName)
      .update({
        status,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(this.defaultSelect)
      .single();

    if (error) {
      throw new Error(`Failed to update campaign status: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to update campaign status: record not found');
    }

    await this.auditService.logAuditEvent('update', 'campaign', id, { status });

    return result as unknown as Campaign;
  }

  /**
   * Get campaign with progress calculation
   */
  async getCampaignWithProgress(
    id: string,
    tenantId: string
  ): Promise<CampaignWithProgress | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(`
        *,
        funds:fund_id (id, name, code)
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get campaign with progress: ${error.message}`);
    }

    if (!data) return null;

    return this.enrichCampaignWithProgress(data as unknown as Campaign);
  }

  /**
   * Get all active campaigns with progress
   */
  async getActiveCampaigns(tenantId: string): Promise<CampaignWithProgress[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(`
        *,
        funds:fund_id (id, name, code)
      `)
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('start_date', { ascending: false });

    if (error) {
      throw new Error(`Failed to get active campaigns: ${error.message}`);
    }

    return (data || []).map((campaign) =>
      this.enrichCampaignWithProgress(campaign as unknown as Campaign)
    );
  }

  /**
   * Refresh campaign totals (called by trigger or manually)
   */
  async refreshCampaignTotals(campaignId: string, tenantId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();

    // Calculate totals from donations
    const { data: donations, error: donationError } = await supabase
      .from('donations')
      .select('amount, member_id')
      .eq('campaign_id', campaignId)
      .eq('tenant_id', tenantId)
      .eq('status', 'paid')
      .is('deleted_at', null);

    if (donationError) {
      throw new Error(`Failed to calculate campaign totals: ${donationError.message}`);
    }

    const totalRaised = (donations || []).reduce((sum, d) => sum + (d.amount || 0), 0);
    const uniqueDonors = new Set((donations || []).map((d) => d.member_id || 'anonymous'));
    const donorCount = uniqueDonors.size;

    // Update campaign
    const { error: updateError } = await supabase
      .from(this.tableName)
      .update({
        total_raised: totalRaised,
        donor_count: donorCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId)
      .eq('tenant_id', tenantId);

    if (updateError) {
      throw new Error(`Failed to update campaign totals: ${updateError.message}`);
    }
  }

  /**
   * Enrich campaign with calculated progress fields
   */
  private enrichCampaignWithProgress(campaign: Campaign): CampaignWithProgress {
    const now = new Date();
    const endDate = campaign.end_date ? new Date(campaign.end_date) : null;

    // Calculate progress percentage
    let progressPercentage = 0;
    if (campaign.goal_amount && campaign.goal_amount > 0) {
      progressPercentage = Math.min(
        100,
        Math.round((campaign.total_raised / campaign.goal_amount) * 100)
      );
    }

    // Calculate days remaining
    let daysRemaining: number | null = null;
    if (endDate && endDate > now) {
      const diffTime = endDate.getTime() - now.getTime();
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Determine if active
    const startDate = new Date(campaign.start_date);
    const isActive =
      campaign.status === 'active' &&
      startDate <= now &&
      (!endDate || endDate >= now);

    return {
      ...campaign,
      progress_percentage: progressPercentage,
      days_remaining: daysRemaining,
      is_active: isActive,
    };
  }
}
