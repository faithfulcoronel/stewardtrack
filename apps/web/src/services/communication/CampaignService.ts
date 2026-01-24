import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { ICampaignRepository } from '@/repositories/communication/campaign.repository';
import type { IRecipientRepository } from '@/repositories/communication/recipient.repository';
import type { ITemplateRepository } from '@/repositories/communication/template.repository';

// Re-export CampaignService type for container.ts
export type { CampaignService };
import type { CampaignFilters } from '@/adapters/communication/campaign.adapter';
import type {
  Campaign,
  CreateCampaignDto,
  UpdateCampaignDto,
  CampaignStats,
  CampaignActivity,
  CampaignStatus,
} from '@/models/communication/campaign.model';
import type { CreateRecipientDto } from '@/models/communication/recipient.model';

export interface CampaignService {
  createCampaign(data: CreateCampaignDto, tenantId: string): Promise<Campaign>;
  updateCampaign(id: string, data: UpdateCampaignDto, tenantId: string): Promise<Campaign>;
  deleteCampaign(id: string, tenantId: string): Promise<void>;
  getCampaigns(tenantId: string, filters?: CampaignFilters): Promise<Campaign[]>;
  getCampaignById(id: string, tenantId: string): Promise<Campaign | null>;
  getCampaignStats(tenantId: string, days?: number): Promise<CampaignStats>;
  getRecentActivity(tenantId: string, limit?: number): Promise<CampaignActivity[]>;
  duplicateCampaign(id: string, tenantId: string, newName?: string): Promise<Campaign>;
  updateCampaignStatus(id: string, status: CampaignStatus, tenantId: string): Promise<Campaign>;
  addRecipients(campaignId: string, recipients: CreateRecipientDto[], tenantId: string): Promise<void>;
}

@injectable()
export class SupabaseCampaignService implements CampaignService {
  constructor(
    @inject(TYPES.ICommCampaignRepository) private campaignRepo: ICampaignRepository,
    @inject(TYPES.IRecipientRepository) private recipientRepo: IRecipientRepository,
    @inject(TYPES.ITemplateRepository) private templateRepo: ITemplateRepository
  ) {}

  async createCampaign(data: CreateCampaignDto, tenantId: string): Promise<Campaign> {
    // If using a template, increment its usage count
    if (data.template_id) {
      await this.templateRepo.incrementUsageCount(data.template_id);
    }

    return await this.campaignRepo.createCampaign(data, tenantId);
  }

  async updateCampaign(id: string, data: UpdateCampaignDto, tenantId: string): Promise<Campaign> {
    // Cannot update a campaign that is already sent
    const existing = await this.campaignRepo.getCampaignById(id, tenantId);
    if (!existing) {
      throw new Error('Campaign not found');
    }

    if (existing.status === 'sent' || existing.status === 'sending') {
      // Only allow updating certain fields for sent campaigns
      const allowedFields: (keyof UpdateCampaignDto)[] = ['name', 'description'];
      const restrictedUpdate: UpdateCampaignDto = {};
      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          (restrictedUpdate as Record<string, unknown>)[field] = data[field];
        }
      }
      return await this.campaignRepo.updateCampaign(id, restrictedUpdate, tenantId);
    }

    return await this.campaignRepo.updateCampaign(id, data, tenantId);
  }

  async deleteCampaign(id: string, tenantId: string): Promise<void> {
    const existing = await this.campaignRepo.getCampaignById(id, tenantId);
    if (!existing) {
      throw new Error('Campaign not found');
    }

    // Cannot delete a campaign that is currently sending
    if (existing.status === 'sending') {
      throw new Error('Cannot delete a campaign that is currently sending');
    }

    await this.campaignRepo.deleteCampaign(id, tenantId);
  }

  async getCampaigns(tenantId: string, filters?: CampaignFilters): Promise<Campaign[]> {
    return await this.campaignRepo.getCampaigns(tenantId, filters);
  }

  async getCampaignById(id: string, tenantId: string): Promise<Campaign | null> {
    return await this.campaignRepo.getCampaignById(id, tenantId);
  }

  async getCampaignStats(tenantId: string, days?: number): Promise<CampaignStats> {
    return await this.campaignRepo.getCampaignStats(tenantId, days);
  }

  async getRecentActivity(tenantId: string, limit?: number): Promise<CampaignActivity[]> {
    return await this.campaignRepo.getRecentActivity(tenantId, limit);
  }

  async duplicateCampaign(id: string, tenantId: string, newName?: string): Promise<Campaign> {
    const existing = await this.campaignRepo.getCampaignById(id, tenantId);
    if (!existing) {
      throw new Error('Campaign not found');
    }

    const duplicateData: CreateCampaignDto = {
      name: newName || `${existing.name} (Copy)`,
      description: existing.description ?? undefined,
      campaign_type: existing.campaign_type,
      channels: existing.channels,
      subject: existing.subject ?? undefined,
      content_html: existing.content_html ?? undefined,
      content_text: existing.content_text ?? undefined,
      template_id: existing.template_id ?? undefined,
      recipient_criteria: existing.recipient_criteria ?? undefined,
    };

    return await this.campaignRepo.createCampaign(duplicateData, tenantId);
  }

  async updateCampaignStatus(id: string, status: CampaignStatus, tenantId: string): Promise<Campaign> {
    const existing = await this.campaignRepo.getCampaignById(id, tenantId);
    if (!existing) {
      throw new Error('Campaign not found');
    }

    // Validate status transitions
    const validTransitions: Record<CampaignStatus, CampaignStatus[]> = {
      draft: ['scheduled', 'sending', 'cancelled'],
      scheduled: ['draft', 'sending', 'cancelled'],
      sending: ['sent', 'paused', 'failed'],
      sent: [], // No transitions from sent
      paused: ['sending', 'cancelled'],
      cancelled: ['draft'], // Can revert to draft
      failed: ['draft'], // Can retry by reverting to draft
    };

    if (!validTransitions[existing.status].includes(status)) {
      throw new Error(`Cannot transition from ${existing.status} to ${status}`);
    }

    const updateData: UpdateCampaignDto = { status };

    // Set sent_at when campaign is marked as sent
    if (status === 'sent') {
      (updateData as Record<string, unknown>).sent_at = new Date().toISOString();
    }

    return await this.campaignRepo.updateCampaign(id, updateData, tenantId);
  }

  async addRecipients(
    campaignId: string,
    recipients: CreateRecipientDto[],
    tenantId: string
  ): Promise<void> {
    // Verify campaign exists and is in draft status
    const campaign = await this.campaignRepo.getCampaignById(campaignId, tenantId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    if (campaign.status !== 'draft') {
      throw new Error('Can only add recipients to draft campaigns');
    }

    // Create recipients
    await this.recipientRepo.createRecipients(recipients, tenantId);

    // Update campaign recipient count
    const counts = await this.recipientRepo.getRecipientCounts(campaignId);
    await this.campaignRepo.updateCampaignCounts(campaignId, {
      total_recipients: counts.total,
    });
  }
}
