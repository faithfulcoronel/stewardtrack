import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import type { ICampaignAdapter } from '@/adapters/campaign.adapter';
import type {
  Campaign,
  CreateCampaignDto,
  UpdateCampaignDto,
  CampaignWithProgress,
  CampaignStatus,
} from '@/models/campaign.model';
import { TYPES } from '@/lib/types';

/**
 * Interface for Campaign repository operations
 */
export interface ICampaignRepository extends BaseRepository<Campaign> {
  createCampaign(data: CreateCampaignDto, tenantId: string): Promise<Campaign>;
  updateCampaign(id: string, data: UpdateCampaignDto, tenantId: string): Promise<Campaign>;
  updateCampaignStatus(id: string, status: CampaignStatus, tenantId: string): Promise<Campaign>;
  getCampaignWithProgress(id: string, tenantId: string): Promise<CampaignWithProgress | null>;
  getActiveCampaigns(tenantId: string): Promise<CampaignWithProgress[]>;
  refreshCampaignTotals(campaignId: string, tenantId: string): Promise<void>;
}

@injectable()
export class CampaignRepository
  extends BaseRepository<Campaign>
  implements ICampaignRepository
{
  constructor(@inject(TYPES.ICampaignAdapter) private campaignAdapter: ICampaignAdapter) {
    super(campaignAdapter);
  }

  /**
   * Create a new campaign
   */
  async createCampaign(data: CreateCampaignDto, tenantId: string): Promise<Campaign> {
    return await this.campaignAdapter.createCampaign(data, tenantId);
  }

  /**
   * Update a campaign
   */
  async updateCampaign(id: string, data: UpdateCampaignDto, tenantId: string): Promise<Campaign> {
    return await this.campaignAdapter.updateCampaign(id, data, tenantId);
  }

  /**
   * Update campaign status
   */
  async updateCampaignStatus(
    id: string,
    status: CampaignStatus,
    tenantId: string
  ): Promise<Campaign> {
    return await this.campaignAdapter.updateCampaignStatus(id, status, tenantId);
  }

  /**
   * Get campaign with progress calculation
   */
  async getCampaignWithProgress(
    id: string,
    tenantId: string
  ): Promise<CampaignWithProgress | null> {
    return await this.campaignAdapter.getCampaignWithProgress(id, tenantId);
  }

  /**
   * Get all active campaigns with progress
   */
  async getActiveCampaigns(tenantId: string): Promise<CampaignWithProgress[]> {
    return await this.campaignAdapter.getActiveCampaigns(tenantId);
  }

  /**
   * Refresh campaign totals
   */
  async refreshCampaignTotals(campaignId: string, tenantId: string): Promise<void> {
    return await this.campaignAdapter.refreshCampaignTotals(campaignId, tenantId);
  }
}
