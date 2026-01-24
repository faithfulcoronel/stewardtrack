import 'server-only';
import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { TYPES } from '@/lib/types';
import type {
  IRecipientAdapter,
  RecipientFilters,
  RecipientCounts,
} from '@/adapters/communication/recipient.adapter';
import type {
  CampaignRecipient,
  CreateRecipientDto,
  UpdateRecipientStatusDto,
} from '@/models/communication/recipient.model';

export interface IRecipientRepository {
  createRecipient(data: CreateRecipientDto, tenantId: string): Promise<CampaignRecipient>;
  createRecipients(data: CreateRecipientDto[], tenantId: string): Promise<CampaignRecipient[]>;
  updateRecipientStatus(id: string, data: UpdateRecipientStatusDto): Promise<CampaignRecipient>;
  getRecipientsByCampaign(campaignId: string, tenantId: string, filters?: RecipientFilters): Promise<CampaignRecipient[]>;
  getRecipientById(id: string, tenantId: string): Promise<CampaignRecipient | null>;
  getPendingRecipients(campaignId: string, limit?: number): Promise<CampaignRecipient[]>;
  getRecipientCounts(campaignId: string): Promise<RecipientCounts>;
  deleteRecipientsByCampaign(campaignId: string, tenantId: string): Promise<void>;
}

@injectable()
export class RecipientRepository extends BaseRepository<CampaignRecipient> implements IRecipientRepository {
  constructor(
    @inject(TYPES.IRecipientAdapter) private readonly recipientAdapter: IRecipientAdapter
  ) {
    super(recipientAdapter);
  }

  async createRecipient(data: CreateRecipientDto, tenantId: string): Promise<CampaignRecipient> {
    return await this.recipientAdapter.createRecipient(data, tenantId);
  }

  async createRecipients(data: CreateRecipientDto[], tenantId: string): Promise<CampaignRecipient[]> {
    return await this.recipientAdapter.createRecipients(data, tenantId);
  }

  async updateRecipientStatus(id: string, data: UpdateRecipientStatusDto): Promise<CampaignRecipient> {
    return await this.recipientAdapter.updateRecipientStatus(id, data);
  }

  async getRecipientsByCampaign(
    campaignId: string,
    tenantId: string,
    filters?: RecipientFilters
  ): Promise<CampaignRecipient[]> {
    return await this.recipientAdapter.getRecipientsByCampaign(campaignId, tenantId, filters);
  }

  async getRecipientById(id: string, tenantId: string): Promise<CampaignRecipient | null> {
    return await this.recipientAdapter.getRecipientById(id, tenantId);
  }

  async getPendingRecipients(campaignId: string, limit?: number): Promise<CampaignRecipient[]> {
    return await this.recipientAdapter.getPendingRecipients(campaignId, limit);
  }

  async getRecipientCounts(campaignId: string): Promise<RecipientCounts> {
    return await this.recipientAdapter.getRecipientCounts(campaignId);
  }

  async deleteRecipientsByCampaign(campaignId: string, tenantId: string): Promise<void> {
    return await this.recipientAdapter.deleteRecipientsByCampaign(campaignId, tenantId);
  }
}
