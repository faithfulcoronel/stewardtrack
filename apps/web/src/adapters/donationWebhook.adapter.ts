import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';
import type {
  DonationWebhook,
  LogWebhookDto,
  WebhookStatus,
} from '@/models/donationWebhook.model';

/**
 * Interface for DonationWebhook data access operations
 */
export interface IDonationWebhookAdapter extends IBaseAdapter<DonationWebhook> {
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
export class DonationWebhookAdapter
  extends BaseAdapter<DonationWebhook>
  implements IDonationWebhookAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'donation_webhooks';

  protected defaultSelect = `
    id,
    tenant_id,
    xendit_webhook_id,
    event_type,
    donation_id,
    xendit_payment_id,
    payload_sanitized,
    status,
    processed_at,
    error_message,
    retry_count,
    received_at,
    created_at,
    updated_at
  `;

  /**
   * Log a new webhook event
   */
  async logWebhook(data: LogWebhookDto): Promise<DonationWebhook> {
    const supabase = await this.getSupabaseClient();

    const record = {
      tenant_id: data.tenant_id || null,
      xendit_webhook_id: data.xendit_webhook_id,
      event_type: data.event_type,
      donation_id: data.donation_id || null,
      xendit_payment_id: data.xendit_payment_id || null,
      payload_sanitized: data.payload_sanitized || null,
      status: 'received' as WebhookStatus,
      retry_count: 0,
      received_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: result, error } = await supabase
      .from(this.tableName)
      .insert([record])
      .select(this.defaultSelect)
      .single();

    if (error) {
      throw new Error(`Failed to log webhook: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to log webhook: missing response payload');
    }

    return result as unknown as DonationWebhook;
  }

  /**
   * Update webhook status
   */
  async updateWebhookStatus(
    id: string,
    status: WebhookStatus,
    errorMessage?: string | null
  ): Promise<DonationWebhook> {
    const supabase = await this.getSupabaseClient();

    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'processed') {
      updateData.processed_at = new Date().toISOString();
    }

    if (errorMessage !== undefined) {
      updateData.error_message = errorMessage;
    }

    const { data: result, error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .select(this.defaultSelect)
      .single();

    if (error) {
      throw new Error(`Failed to update webhook status: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to update webhook status: record not found');
    }

    return result as unknown as DonationWebhook;
  }

  /**
   * Mark webhook as successfully processed
   */
  async markAsProcessed(id: string, donationId: string): Promise<DonationWebhook> {
    const supabase = await this.getSupabaseClient();

    const { data: result, error } = await supabase
      .from(this.tableName)
      .update({
        status: 'processed' as WebhookStatus,
        donation_id: donationId,
        processed_at: new Date().toISOString(),
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(this.defaultSelect)
      .single();

    if (error) {
      throw new Error(`Failed to mark webhook as processed: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to mark webhook as processed: record not found');
    }

    return result as unknown as DonationWebhook;
  }

  /**
   * Mark webhook as failed
   */
  async markAsFailed(id: string, errorMessage: string): Promise<DonationWebhook> {
    const supabase = await this.getSupabaseClient();

    const { data: result, error } = await supabase
      .from(this.tableName)
      .update({
        status: 'failed' as WebhookStatus,
        error_message: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(this.defaultSelect)
      .single();

    if (error) {
      throw new Error(`Failed to mark webhook as failed: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to mark webhook as failed: record not found');
    }

    return result as unknown as DonationWebhook;
  }

  /**
   * Increment retry count for a webhook
   */
  async incrementRetryCount(id: string): Promise<DonationWebhook> {
    const supabase = await this.getSupabaseClient();

    // First get current retry count
    const { data: current, error: fetchError } = await supabase
      .from(this.tableName)
      .select('retry_count')
      .eq('id', id)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch webhook for retry: ${fetchError.message}`);
    }

    const newRetryCount = ((current as any)?.retry_count || 0) + 1;

    const { data: result, error } = await supabase
      .from(this.tableName)
      .update({
        retry_count: newRetryCount,
        status: 'processing' as WebhookStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(this.defaultSelect)
      .single();

    if (error) {
      throw new Error(`Failed to increment retry count: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to increment retry count: record not found');
    }

    return result as unknown as DonationWebhook;
  }

  /**
   * Find webhook by Xendit webhook ID (for idempotency)
   */
  async findByXenditWebhookId(xenditWebhookId: string): Promise<DonationWebhook | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('xendit_webhook_id', xenditWebhookId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to find webhook by Xendit ID: ${error.message}`);
    }

    return (data as unknown as DonationWebhook) || null;
  }

  /**
   * Find webhooks by payment ID
   */
  async findByPaymentId(xenditPaymentId: string): Promise<DonationWebhook[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('xendit_payment_id', xenditPaymentId)
      .order('received_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to find webhooks by payment ID: ${error.message}`);
    }

    return (data as unknown as DonationWebhook[]) || [];
  }

  /**
   * Get recent webhooks for a tenant
   */
  async getRecentWebhooks(tenantId: string, limit = 50): Promise<DonationWebhook[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('tenant_id', tenantId)
      .order('received_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get recent webhooks: ${error.message}`);
    }

    return (data as unknown as DonationWebhook[]) || [];
  }

  /**
   * Get failed webhooks for a tenant
   */
  async getFailedWebhooks(tenantId: string): Promise<DonationWebhook[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('tenant_id', tenantId)
      .eq('status', 'failed')
      .order('received_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get failed webhooks: ${error.message}`);
    }

    return (data as unknown as DonationWebhook[]) || [];
  }

  /**
   * Get pending webhooks older than a certain time (for retry)
   */
  async getPendingWebhooks(olderThanMinutes = 5): Promise<DonationWebhook[]> {
    const supabase = await this.getSupabaseClient();

    const cutoffTime = new Date(Date.now() - olderThanMinutes * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .in('status', ['received', 'processing'])
      .lt('received_at', cutoffTime)
      .lt('retry_count', 3) // Max 3 retries
      .order('received_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get pending webhooks: ${error.message}`);
    }

    return (data as unknown as DonationWebhook[]) || [];
  }
}
