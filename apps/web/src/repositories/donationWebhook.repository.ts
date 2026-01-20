import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import type { IDonationWebhookAdapter } from '@/adapters/donationWebhook.adapter';
import type {
  DonationWebhook,
  LogWebhookDto,
  WebhookStatus,
} from '@/models/donationWebhook.model';
import { TYPES } from '@/lib/types';

/**
 * Interface for DonationWebhook repository operations
 */
export interface IDonationWebhookRepository extends BaseRepository<DonationWebhook> {
  logWebhook(data: LogWebhookDto): Promise<DonationWebhook>;
  updateWebhookStatus(
    id: string,
    status: WebhookStatus,
    errorMessage?: string | null
  ): Promise<DonationWebhook>;
  markAsProcessed(id: string, donationId: string): Promise<DonationWebhook>;
  markAsFailed(id: string, errorMessage: string): Promise<DonationWebhook>;
  incrementRetryCount(id: string): Promise<DonationWebhook>;
  findByXenditWebhookId(xenditWebhookId: string): Promise<DonationWebhook | null>;
  findByPaymentId(xenditPaymentId: string): Promise<DonationWebhook[]>;
  getRecentWebhooks(tenantId: string, limit?: number): Promise<DonationWebhook[]>;
  getFailedWebhooks(tenantId: string): Promise<DonationWebhook[]>;
  getPendingWebhooks(olderThanMinutes?: number): Promise<DonationWebhook[]>;
}

@injectable()
export class DonationWebhookRepository
  extends BaseRepository<DonationWebhook>
  implements IDonationWebhookRepository
{
  constructor(
    @inject(TYPES.IDonationWebhookAdapter) private webhookAdapter: IDonationWebhookAdapter
  ) {
    super(webhookAdapter);
  }

  /**
   * Log a new webhook event
   */
  async logWebhook(data: LogWebhookDto): Promise<DonationWebhook> {
    return await this.webhookAdapter.logWebhook(data);
  }

  /**
   * Update webhook status
   */
  async updateWebhookStatus(
    id: string,
    status: WebhookStatus,
    errorMessage?: string | null
  ): Promise<DonationWebhook> {
    return await this.webhookAdapter.updateWebhookStatus(id, status, errorMessage);
  }

  /**
   * Mark webhook as successfully processed
   */
  async markAsProcessed(id: string, donationId: string): Promise<DonationWebhook> {
    return await this.webhookAdapter.markAsProcessed(id, donationId);
  }

  /**
   * Mark webhook as failed
   */
  async markAsFailed(id: string, errorMessage: string): Promise<DonationWebhook> {
    return await this.webhookAdapter.markAsFailed(id, errorMessage);
  }

  /**
   * Increment retry count for a webhook
   */
  async incrementRetryCount(id: string): Promise<DonationWebhook> {
    return await this.webhookAdapter.incrementRetryCount(id);
  }

  /**
   * Find webhook by Xendit webhook ID (for idempotency)
   */
  async findByXenditWebhookId(xenditWebhookId: string): Promise<DonationWebhook | null> {
    return await this.webhookAdapter.findByXenditWebhookId(xenditWebhookId);
  }

  /**
   * Find webhooks by payment ID
   */
  async findByPaymentId(xenditPaymentId: string): Promise<DonationWebhook[]> {
    return await this.webhookAdapter.findByPaymentId(xenditPaymentId);
  }

  /**
   * Get recent webhooks for a tenant
   */
  async getRecentWebhooks(tenantId: string, limit?: number): Promise<DonationWebhook[]> {
    return await this.webhookAdapter.getRecentWebhooks(tenantId, limit);
  }

  /**
   * Get failed webhooks for a tenant
   */
  async getFailedWebhooks(tenantId: string): Promise<DonationWebhook[]> {
    return await this.webhookAdapter.getFailedWebhooks(tenantId);
  }

  /**
   * Get pending webhooks older than a certain time (for retry)
   */
  async getPendingWebhooks(olderThanMinutes?: number): Promise<DonationWebhook[]> {
    return await this.webhookAdapter.getPendingWebhooks(olderThanMinutes);
  }
}
