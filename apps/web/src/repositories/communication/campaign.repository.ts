import 'server-only';
import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { TYPES } from '@/lib/types';
import type { ICampaignAdapter, CampaignFilters, CampaignCounts } from '@/adapters/communication/campaign.adapter';
import type {
  Campaign,
  CreateCampaignDto,
  UpdateCampaignDto,
  CampaignStats,
  CampaignActivity,
} from '@/models/communication/campaign.model';

export interface ICampaignRepository {
  createCampaign(data: CreateCampaignDto, tenantId: string): Promise<Campaign>;
  updateCampaign(id: string, data: UpdateCampaignDto, tenantId: string): Promise<Campaign>;
  deleteCampaign(id: string, tenantId: string): Promise<void>;
  getCampaigns(tenantId: string, filters?: CampaignFilters): Promise<Campaign[]>;
  getCampaignById(id: string, tenantId: string): Promise<Campaign | null>;
  getCampaignStats(tenantId: string, days?: number): Promise<CampaignStats>;
  getRecentActivity(tenantId: string, limit?: number): Promise<CampaignActivity[]>;
  updateCampaignCounts(id: string, counts: Partial<CampaignCounts>): Promise<void>;
}

@injectable()
export class CampaignRepository extends BaseRepository<Campaign> implements ICampaignRepository {
  constructor(
    @inject(TYPES.ICommCampaignAdapter) private readonly campaignAdapter: ICampaignAdapter
  ) {
    super(campaignAdapter);
  }

  async createCampaign(data: CreateCampaignDto, tenantId: string): Promise<Campaign> {
    return await this.campaignAdapter.createCampaign(data, tenantId);
  }

  async updateCampaign(id: string, data: UpdateCampaignDto, tenantId: string): Promise<Campaign> {
    return await this.campaignAdapter.updateCampaign(id, data, tenantId);
  }

  async deleteCampaign(id: string, tenantId: string): Promise<void> {
    return await this.campaignAdapter.deleteCampaign(id, tenantId);
  }

  async getCampaigns(tenantId: string, filters?: CampaignFilters): Promise<Campaign[]> {
    return await this.campaignAdapter.getCampaigns(tenantId, filters);
  }

  async getCampaignById(id: string, tenantId: string): Promise<Campaign | null> {
    return await this.campaignAdapter.getCampaignById(id, tenantId);
  }

  async getCampaignStats(tenantId: string, days?: number): Promise<CampaignStats> {
    return await this.campaignAdapter.getCampaignStats(tenantId, days);
  }

  async getRecentActivity(tenantId: string, limit?: number): Promise<CampaignActivity[]> {
    return await this.campaignAdapter.getRecentActivity(tenantId, limit);
  }

  async updateCampaignCounts(id: string, counts: Partial<CampaignCounts>): Promise<void> {
    return await this.campaignAdapter.updateCampaignCounts(id, counts);
  }
}
