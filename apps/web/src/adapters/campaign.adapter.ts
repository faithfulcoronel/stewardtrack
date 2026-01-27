/**
 * Campaign Adapter
 *
 * Handles database operations for fundraising campaigns.
 * Campaigns track donation goals, progress, and donor engagement over time.
 *
 * @module adapters/campaign
 */
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
 * Interface for campaign database operations.
 * Extends IBaseAdapter with campaign-specific methods for progress tracking.
 */
export interface ICampaignAdapter extends IBaseAdapter<Campaign> {
  /** Create a new fundraising campaign */
  createCampaign(data: CreateCampaignDto, tenantId: string): Promise<Campaign>;
  /** Update campaign details */
  updateCampaign(id: string, data: UpdateCampaignDto, tenantId: string): Promise<Campaign>;
  /** Update campaign status (draft, active, completed, cancelled) */
  updateCampaignStatus(id: string, status: CampaignStatus, tenantId: string): Promise<Campaign>;
  /** Get campaign with calculated progress metrics */
  getCampaignWithProgress(id: string, tenantId: string): Promise<CampaignWithProgress | null>;
  /** Get all active campaigns with progress */
  getActiveCampaigns(tenantId: string): Promise<CampaignWithProgress[]>;
  /** Recalculate campaign totals from donations */
  refreshCampaignTotals(campaignId: string, tenantId: string): Promise<void>;
}

/**
 * Campaign adapter implementation.
 *
 * Provides database operations for managing fundraising campaigns including:
 * - Creating campaigns with goals, dates, and fund allocation
 * - Tracking progress with real-time totals and donor counts
 * - Managing campaign lifecycle (draft → active → completed)
 * - Calculating progress percentages and days remaining
 *
 * Campaigns link donations to specific fundraising goals and
 * provide visibility into giving progress over time.
 *
 * @extends BaseAdapter<Campaign>
 * @implements ICampaignAdapter
 */
@injectable()
export class CampaignAdapter extends BaseAdapter<Campaign> implements ICampaignAdapter {
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  /** Database table name for campaigns */
  protected tableName = 'campaigns';

  /** Default fields to select in queries */
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

  /** Default relationships to include in queries */
  protected defaultRelationships: QueryOptions['relationships'] = [
    {
      table: 'funds',
      foreignKey: 'fund_id',
      select: ['id', 'name', 'code'],
    },
  ];

  /**
   * Post-create hook to log audit event.
   *
   * @param data - Created campaign data
   */
  protected override async onAfterCreate(data: Campaign): Promise<void> {
    await this.auditService.logAuditEvent('create', 'campaign', data.id, {
      name: data.name,
      goal_amount: data.goal_amount,
    });
  }

  /**
   * Post-update hook to log audit event.
   *
   * @param data - Updated campaign data
   */
  protected override async onAfterUpdate(data: Campaign): Promise<void> {
    await this.auditService.logAuditEvent('update', 'campaign', data.id, {
      name: data.name,
      status: data.status,
    });
  }

  /**
   * Create a new fundraising campaign.
   *
   * @param data - Campaign creation data
   * @param tenantId - Tenant ID for isolation
   * @returns Created campaign record
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
   * Update a campaign's details.
   *
   * @param id - Campaign ID to update
   * @param data - Campaign update data
   * @param tenantId - Tenant ID for isolation
   * @returns Updated campaign record
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
   * Update a campaign's status.
   * Status transitions: draft → active → completed or cancelled.
   *
   * @param id - Campaign ID to update
   * @param status - New campaign status
   * @param tenantId - Tenant ID for isolation
   * @returns Updated campaign record
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
   * Get a campaign with calculated progress metrics.
   * Includes progress percentage, days remaining, and active status.
   *
   * @param id - Campaign ID to fetch
   * @param tenantId - Tenant ID for isolation
   * @returns Campaign with progress data or null if not found
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
   * Get all active campaigns with progress metrics.
   * Returns campaigns currently accepting donations.
   *
   * @param tenantId - Tenant ID for isolation
   * @returns Array of active campaigns with progress data
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
   * Refresh campaign totals by recalculating from donations.
   * Updates total_raised and donor_count based on paid donations.
   * Can be called manually or triggered after donation updates.
   *
   * @param campaignId - Campaign ID to refresh
   * @param tenantId - Tenant ID for isolation
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
   * Enrich campaign with calculated progress fields.
   * Adds progress_percentage, days_remaining, and is_active flags.
   *
   * @param campaign - Base campaign record
   * @returns Campaign enriched with progress metrics
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
