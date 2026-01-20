import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { ICampaignRepository } from '@/repositories/campaign.repository';
import type {
  Campaign,
  CreateCampaignDto,
  UpdateCampaignDto,
  CampaignStatus,
  CampaignWithProgress,
} from '@/models/campaign.model';

/**
 * CampaignService
 *
 * Service for managing donation campaigns.
 * Key responsibilities:
 * - Campaign CRUD operations
 * - Progress tracking and calculations
 * - Status management
 */
@injectable()
export class CampaignService {
  constructor(
    @inject(TYPES.ICampaignRepository) private campaignRepository: ICampaignRepository
  ) {}

  // ==================== CAMPAIGN CRUD ====================

  /**
   * Create a new campaign
   */
  async createCampaign(
    dto: CreateCampaignDto,
    tenantId: string
  ): Promise<Campaign> {
    // Validate dates
    if (dto.end_date && dto.start_date) {
      const start = new Date(dto.start_date);
      const end = new Date(dto.end_date);
      if (end < start) {
        throw new Error('End date must be after start date');
      }
    }

    // Validate goal amount
    if (dto.goal_amount !== undefined && dto.goal_amount < 0) {
      throw new Error('Goal amount cannot be negative');
    }

    return await this.campaignRepository.createCampaign(dto, tenantId);
  }

  /**
   * Update a campaign
   */
  async updateCampaign(
    id: string,
    dto: UpdateCampaignDto,
    tenantId: string
  ): Promise<Campaign> {
    // Validate dates if both provided
    if (dto.end_date && dto.start_date) {
      const start = new Date(dto.start_date);
      const end = new Date(dto.end_date);
      if (end < start) {
        throw new Error('End date must be after start date');
      }
    }

    // Validate goal amount
    if (dto.goal_amount !== undefined && dto.goal_amount < 0) {
      throw new Error('Goal amount cannot be negative');
    }

    return await this.campaignRepository.updateCampaign(id, dto, tenantId);
  }

  /**
   * Get a campaign by ID
   */
  async getCampaign(id: string, tenantId: string): Promise<Campaign | null> {
    const result = await this.campaignRepository.findById(id);
    // Verify tenant access
    if (result && result.tenant_id !== tenantId) {
      return null;
    }
    return result;
  }

  /**
   * Get campaign with progress information
   */
  async getCampaignWithProgress(
    id: string,
    tenantId: string
  ): Promise<CampaignWithProgress | null> {
    return await this.campaignRepository.getCampaignWithProgress(id, tenantId);
  }

  // ==================== CAMPAIGN LISTS ====================

  /**
   * Get all active campaigns for a tenant
   */
  async getActiveCampaigns(tenantId: string): Promise<CampaignWithProgress[]> {
    return await this.campaignRepository.getActiveCampaigns(tenantId);
  }

  /**
   * Get all campaigns for a tenant (any status)
   */
  async getAllCampaigns(tenantId: string): Promise<Campaign[]> {
    const result = await this.campaignRepository.findAll();
    // Filter by tenant
    return (result?.data || []).filter(c => c.tenant_id === tenantId);
  }

  // ==================== CAMPAIGN STATUS ====================

  /**
   * Update campaign status
   */
  async updateCampaignStatus(
    id: string,
    status: CampaignStatus,
    tenantId: string
  ): Promise<Campaign> {
    // Validate status transition
    const campaign = await this.getCampaign(id, tenantId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Validate status transitions
    this.validateStatusTransition(campaign.status, status);

    return await this.campaignRepository.updateCampaignStatus(id, status, tenantId);
  }

  /**
   * Activate a draft campaign
   */
  async activateCampaign(id: string, tenantId: string): Promise<Campaign> {
    return await this.updateCampaignStatus(id, 'active', tenantId);
  }

  /**
   * Complete a campaign
   */
  async completeCampaign(id: string, tenantId: string): Promise<Campaign> {
    return await this.updateCampaignStatus(id, 'completed', tenantId);
  }

  /**
   * Cancel a campaign
   */
  async cancelCampaign(id: string, tenantId: string): Promise<Campaign> {
    return await this.updateCampaignStatus(id, 'cancelled', tenantId);
  }

  // ==================== PROGRESS TRACKING ====================

  /**
   * Refresh campaign totals (after donation)
   */
  async refreshCampaignTotals(campaignId: string, tenantId: string): Promise<void> {
    await this.campaignRepository.refreshCampaignTotals(campaignId, tenantId);
  }

  /**
   * Calculate progress percentage for a campaign
   */
  calculateProgressPercentage(campaign: Campaign): number {
    if (!campaign.goal_amount || campaign.goal_amount <= 0) {
      return 0;
    }
    const percentage = (campaign.total_raised / campaign.goal_amount) * 100;
    return Math.min(Math.round(percentage * 10) / 10, 100); // Cap at 100%, round to 1 decimal
  }

  /**
   * Calculate days remaining for a campaign
   */
  calculateDaysRemaining(campaign: Campaign): number | null {
    if (!campaign.end_date) {
      return null;
    }
    const now = new Date();
    const end = new Date(campaign.end_date);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  // ==================== VALIDATION ====================

  /**
   * Validate status transition
   */
  private validateStatusTransition(
    currentStatus: CampaignStatus,
    newStatus: CampaignStatus
  ): void {
    const validTransitions: Record<CampaignStatus, CampaignStatus[]> = {
      draft: ['active', 'cancelled'],
      active: ['completed', 'cancelled'],
      completed: [], // Cannot transition from completed
      cancelled: [], // Cannot transition from cancelled
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new Error(
        `Cannot transition campaign from ${currentStatus} to ${newStatus}`
      );
    }
  }
}
