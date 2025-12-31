import 'server-only';
import 'reflect-metadata';
import { injectable } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import type {
  NotificationQueueItem,
  QueueStatus,
  QueueStatistics,
  QueueProcessingOptions,
} from '@/models/notification/notificationQueue.model';

export interface INotificationQueueAdapter extends IBaseAdapter<NotificationQueueItem> {
  /**
   * Get pending items ready for processing
   */
  getPendingItems(options?: QueueProcessingOptions): Promise<NotificationQueueItem[]>;

  /**
   * Claim an item for processing (atomic status update)
   */
  claimItem(id: string): Promise<NotificationQueueItem | null>;

  /**
   * Mark item as completed
   */
  markCompleted(id: string, providerMessageId?: string): Promise<void>;

  /**
   * Mark item as failed with retry
   */
  markFailed(id: string, error: string, retryable: boolean): Promise<void>;

  /**
   * Move item to dead letter queue
   */
  markDead(id: string, error: string): Promise<void>;

  /**
   * Get queue statistics
   */
  getStatistics(tenantId?: string): Promise<QueueStatistics>;

  /**
   * Delete old completed items
   */
  cleanupCompleted(olderThanDays: number): Promise<number>;

  /**
   * Retry failed items
   */
  retryFailed(ids?: string[]): Promise<number>;
}

@injectable()
export class NotificationQueueAdapter
  extends BaseAdapter<NotificationQueueItem>
  implements INotificationQueueAdapter
{
  protected tableName = 'notification_queue';

  protected defaultSelect = `
    id,
    event_type,
    event_id,
    tenant_id,
    recipient_id,
    channel,
    payload,
    status,
    priority,
    attempts,
    max_attempts,
    next_attempt_at,
    scheduled_for,
    created_at,
    processed_at,
    completed_at,
    error_message,
    correlation_id,
    parent_queue_id
  `;

  async getPendingItems(options: QueueProcessingOptions = {}): Promise<NotificationQueueItem[]> {
    const {
      batchSize = 100,
      channels,
      tenantId,
      includeScheduled = true,
    } = options;

    const supabase = await this.getSupabaseClient();
    let query = supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('status', 'pending')
      .lte('next_attempt_at', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('next_attempt_at', { ascending: true })
      .limit(batchSize);

    if (channels && channels.length > 0) {
      query = query.in('channel', channels);
    }

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    if (includeScheduled) {
      // Include scheduled items that are due
      query = query.or(`scheduled_for.is.null,scheduled_for.lte.${new Date().toISOString()}`);
    } else {
      query = query.is('scheduled_for', null);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data ?? []) as unknown as NotificationQueueItem[];
  }

  async claimItem(id: string): Promise<NotificationQueueItem | null> {
    const supabase = await this.getSupabaseClient();

    // Atomic update: only claim if still pending
    const { data, error } = await supabase
      .from(this.tableName)
      .update({
        status: 'processing',
        processed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'pending')
      .select(this.defaultSelect)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - item was already claimed
        return null;
      }
      throw error;
    }

    const queueItem = data as unknown as NotificationQueueItem;

    // Increment attempts
    if (queueItem) {
      await supabase
        .from(this.tableName)
        .update({ attempts: (queueItem.attempts || 0) + 1 })
        .eq('id', id);
    }

    return queueItem;
  }

  async markCompleted(id: string, _providerMessageId?: string): Promise<void> {
    const supabase = await this.getSupabaseClient();

    const updateData: Record<string, unknown> = {
      status: 'completed',
      completed_at: new Date().toISOString(),
      error_message: null,
    };

    const { error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
  }

  async markFailed(id: string, errorMessage: string, retryable: boolean): Promise<void> {
    const supabase = await this.getSupabaseClient();

    // Get current item to check attempts
    const { data: item, error: fetchError } = await supabase
      .from(this.tableName)
      .select('attempts, max_attempts')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const attempts = item?.attempts ?? 1;
    const maxAttempts = item?.max_attempts ?? 3;

    if (!retryable || attempts >= maxAttempts) {
      // Move to dead letter queue
      await this.markDead(id, errorMessage);
      return;
    }

    // Calculate next retry with exponential backoff
    const backoffMs = Math.min(1000 * Math.pow(2, attempts), 3600000); // Max 1 hour
    const nextAttemptAt = new Date(Date.now() + backoffMs).toISOString();

    const { error } = await supabase
      .from(this.tableName)
      .update({
        status: 'pending',
        next_attempt_at: nextAttemptAt,
        error_message: errorMessage,
      })
      .eq('id', id);

    if (error) throw error;
  }

  async markDead(id: string, errorMessage: string): Promise<void> {
    const supabase = await this.getSupabaseClient();

    const { error } = await supabase
      .from(this.tableName)
      .update({
        status: 'dead',
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  }

  async getStatistics(tenantId?: string): Promise<QueueStatistics> {
    const supabase = await this.getSupabaseClient();

    // Get counts by status
    const statuses: QueueStatus[] = ['pending', 'processing', 'completed', 'failed', 'dead'];
    const counts: Record<string, number> = {};

    for (const status of statuses) {
      let query = supabase
        .from(this.tableName)
        .select('id', { count: 'exact', head: true })
        .eq('status', status);

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { count, error } = await query;
      if (error) throw error;
      counts[status] = count ?? 0;
    }

    // Get scheduled count
    let scheduledQuery = supabase
      .from(this.tableName)
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .not('scheduled_for', 'is', null)
      .gt('scheduled_for', new Date().toISOString());

    if (tenantId) {
      scheduledQuery = scheduledQuery.eq('tenant_id', tenantId);
    }

    const { count: scheduledCount } = await scheduledQuery;

    // Get oldest pending
    let oldestQuery = supabase
      .from(this.tableName)
      .select('created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1);

    if (tenantId) {
      oldestQuery = oldestQuery.eq('tenant_id', tenantId);
    }

    const { data: oldestData } = await oldestQuery;

    return {
      pending: counts['pending'] ?? 0,
      processing: counts['processing'] ?? 0,
      completed: counts['completed'] ?? 0,
      failed: counts['failed'] ?? 0,
      dead: counts['dead'] ?? 0,
      scheduled: scheduledCount ?? 0,
      total: Object.values(counts).reduce((a, b) => a + b, 0),
      oldestPending: oldestData?.[0]?.created_at,
    };
  }

  async cleanupCompleted(olderThanDays: number): Promise<number> {
    const supabase = await this.getSupabaseClient();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const { data, error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('status', 'completed')
      .lt('completed_at', cutoffDate.toISOString())
      .select('id');

    if (error) throw error;
    return data?.length ?? 0;
  }

  async retryFailed(ids?: string[]): Promise<number> {
    const supabase = await this.getSupabaseClient();

    let query = supabase
      .from(this.tableName)
      .update({
        status: 'pending',
        next_attempt_at: new Date().toISOString(),
        error_message: null,
      })
      .eq('status', 'failed');

    if (ids && ids.length > 0) {
      query = query.in('id', ids);
    }

    const { data, error } = await query.select('id');

    if (error) throw error;
    return data?.length ?? 0;
  }
}
