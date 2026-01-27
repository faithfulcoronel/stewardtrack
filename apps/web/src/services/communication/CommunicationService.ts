import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { CampaignService } from './CampaignService';
import type { TemplateService } from './TemplateService';
import type { RecipientService } from './RecipientService';
import type { DeliveryService } from './DeliveryService';
import type { CampaignFilters } from '@/adapters/communication/campaign.adapter';
import type { TemplateFilters } from '@/adapters/communication/template.adapter';
import type {
  Campaign,
  CreateCampaignDto,
  UpdateCampaignDto,
  CampaignStats,
  CampaignActivity,
  RecipientCriteria,
  CommunicationChannel,
} from '@/models/communication/campaign.model';
import type {
  Template,
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplatesByCategory,
} from '@/models/communication/template.model';
import type { RecipientSource } from '@/models/communication/recipient.model';

/**
 * CommunicationService - Main orchestrator for the Communication module
 *
 * This service provides a unified interface for all communication operations,
 * delegating to specialized services for specific functionality.
 *
 * @module communication.core
 *
 * Permission Requirements:
 * - View operations (get*, list*): Requires `communication:view` permission
 * - Manage operations (create*, update*, send*, schedule*, duplicate*): Requires `communication:manage` permission
 * - Delete operations (delete*, cancel*): Requires `communication:delete` permission
 *
 * @see {@link PermissionGate} for permission enforcement in API routes
 */
export interface CommunicationService {
  // Dashboard
  getDashboardStats(tenantId: string): Promise<CampaignStats>;
  getRecentActivity(tenantId: string, limit?: number): Promise<CampaignActivity[]>;

  // Campaigns
  createCampaign(data: CreateCampaignDto, tenantId: string): Promise<Campaign>;
  updateCampaign(id: string, data: UpdateCampaignDto, tenantId: string): Promise<Campaign>;
  deleteCampaign(id: string, tenantId: string): Promise<void>;
  getCampaigns(tenantId: string, filters?: CampaignFilters): Promise<Campaign[]>;
  getCampaignById(id: string, tenantId: string): Promise<Campaign | null>;
  duplicateCampaign(id: string, tenantId: string, newName?: string): Promise<Campaign>;

  // Campaign execution
  sendCampaign(campaignId: string, tenantId: string): Promise<void>;
  scheduleCampaign(campaignId: string, scheduledAt: string, tenantId: string): Promise<Campaign>;
  cancelCampaign(campaignId: string, tenantId: string): Promise<Campaign>;

  // Templates
  createTemplate(data: CreateTemplateDto, tenantId: string): Promise<Template>;
  updateTemplate(id: string, data: UpdateTemplateDto, tenantId: string): Promise<Template>;
  deleteTemplate(id: string, tenantId: string): Promise<void>;
  getTemplates(tenantId: string, filters?: TemplateFilters): Promise<Template[]>;
  getTemplateById(id: string, tenantId: string): Promise<Template | null>;
  getTemplatesGroupedByCategory(tenantId: string): Promise<TemplatesByCategory[]>;

  // Recipients
  getAvailableRecipientSources(tenantId: string): Promise<RecipientSource[]>;
  prepareRecipientsForCampaign(
    campaignId: string,
    criteria: RecipientCriteria,
    channel: CommunicationChannel,
    tenantId: string
  ): Promise<number>;
}

@injectable()
export class SupabaseCommunicationService implements CommunicationService {
  constructor(
    @inject(TYPES.CommCampaignService) private campaignService: CampaignService,
    @inject(TYPES.TemplateService) private templateService: TemplateService,
    @inject(TYPES.RecipientService) private recipientService: RecipientService,
    @inject(TYPES.DeliveryService) private deliveryService: DeliveryService
  ) {}

  // ==================== Dashboard ====================

  async getDashboardStats(tenantId: string): Promise<CampaignStats> {
    return await this.campaignService.getCampaignStats(tenantId);
  }

  async getRecentActivity(tenantId: string, limit?: number): Promise<CampaignActivity[]> {
    return await this.campaignService.getRecentActivity(tenantId, limit);
  }

  // ==================== Campaigns ====================

  async createCampaign(data: CreateCampaignDto, tenantId: string): Promise<Campaign> {
    return await this.campaignService.createCampaign(data, tenantId);
  }

  async updateCampaign(id: string, data: UpdateCampaignDto, tenantId: string): Promise<Campaign> {
    return await this.campaignService.updateCampaign(id, data, tenantId);
  }

  async deleteCampaign(id: string, tenantId: string): Promise<void> {
    return await this.campaignService.deleteCampaign(id, tenantId);
  }

  async getCampaigns(tenantId: string, filters?: CampaignFilters): Promise<Campaign[]> {
    return await this.campaignService.getCampaigns(tenantId, filters);
  }

  async getCampaignById(id: string, tenantId: string): Promise<Campaign | null> {
    return await this.campaignService.getCampaignById(id, tenantId);
  }

  async duplicateCampaign(id: string, tenantId: string, newName?: string): Promise<Campaign> {
    return await this.campaignService.duplicateCampaign(id, tenantId, newName);
  }

  // ==================== Campaign Execution ====================

  async sendCampaign(campaignId: string, tenantId: string): Promise<void> {
    return await this.deliveryService.sendCampaign(campaignId, tenantId);
  }

  async scheduleCampaign(campaignId: string, scheduledAt: string, tenantId: string): Promise<Campaign> {
    return await this.campaignService.updateCampaign(
      campaignId,
      {
        status: 'scheduled',
        scheduled_at: scheduledAt,
      },
      tenantId
    );
  }

  async cancelCampaign(campaignId: string, tenantId: string): Promise<Campaign> {
    return await this.campaignService.updateCampaignStatus(campaignId, 'cancelled', tenantId);
  }

  // ==================== Templates ====================

  async createTemplate(data: CreateTemplateDto, tenantId: string): Promise<Template> {
    return await this.templateService.createTemplate(data, tenantId);
  }

  async updateTemplate(id: string, data: UpdateTemplateDto, tenantId: string): Promise<Template> {
    return await this.templateService.updateTemplate(id, data, tenantId);
  }

  async deleteTemplate(id: string, tenantId: string): Promise<void> {
    return await this.templateService.deleteTemplate(id, tenantId);
  }

  async getTemplates(tenantId: string, filters?: TemplateFilters): Promise<Template[]> {
    return await this.templateService.getTemplates(tenantId, filters);
  }

  async getTemplateById(id: string, tenantId: string): Promise<Template | null> {
    return await this.templateService.getTemplateById(id, tenantId);
  }

  async getTemplatesGroupedByCategory(tenantId: string): Promise<TemplatesByCategory[]> {
    return await this.templateService.getTemplatesGroupedByCategory(tenantId);
  }

  // ==================== Recipients ====================

  async getAvailableRecipientSources(tenantId: string): Promise<RecipientSource[]> {
    return await this.recipientService.getAvailableRecipientSources(tenantId);
  }

  async prepareRecipientsForCampaign(
    campaignId: string,
    criteria: RecipientCriteria,
    channel: CommunicationChannel,
    tenantId: string
  ): Promise<number> {
    const recipients = await this.recipientService.prepareRecipientsForCampaign(
      campaignId,
      criteria,
      channel,
      tenantId
    );
    return recipients.length;
  }
}
