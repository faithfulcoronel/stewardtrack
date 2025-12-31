import 'server-only';
import 'reflect-metadata';
import { injectable } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from '@/adapters/base.adapter';
import type {
  Notification,
  CreateNotificationDto,
  NotificationListResponse,
} from '@/models/notification/notification.model';
import { supabaseWrapper } from '@/lib/supabase/wrapper';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface INotificationAdapter extends IBaseAdapter<Notification> {
  markAsRead(id: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
  deleteExpired(): Promise<void>;
  subscribeToUserNotifications(
    userId: string,
    onInsert: () => void
  ): Promise<RealtimeChannel>;
  getUnreadCount(userId: string): Promise<number>;
  getUserNotifications(
    userId: string,
    options?: { limit?: number; offset?: number; unreadOnly?: boolean }
  ): Promise<NotificationListResponse>;
  createNotification(dto: CreateNotificationDto): Promise<Notification>;
  deleteNotification(id: string, userId: string): Promise<void>;
}

@injectable()
export class NotificationAdapter
  extends BaseAdapter<Notification>
  implements INotificationAdapter
{
  protected tableName = 'notifications';

  protected defaultSelect = `
    id,
    user_id,
    tenant_id,
    title,
    message,
    type,
    category,
    priority,
    is_read,
    action_type,
    action_payload,
    metadata,
    expires_at,
    created_at
  `;

  public async markAsRead(id: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    const { error } = await supabase
      .from(this.tableName)
      .update({ is_read: true })
      .eq('id', id);

    if (error) throw error;
  }

  public async markAllAsRead(userId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    const { error } = await supabase
      .from(this.tableName)
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
  }

  public async deleteExpired(): Promise<void> {
    const supabase = await this.getSupabaseClient();
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) throw error;
  }

  protected override async buildSecureQuery(options: QueryOptions = {}): Promise<any> {
    const { query } = await super.buildSecureQuery(options);
    
    // Add user_id filter if not already present
    if (!options.filters?.user_id) {
      const supabase = await this.getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        query.eq('user_id', user.id);
      }
    }

    return { query };
  }

  public async subscribeToUserNotifications(
    userId: string,
    onInsert: () => void
  ): Promise<RealtimeChannel> {
    const supabase = await this.getSupabaseClient();
    const channel = supabase
      .channel('notification-listener')
      .on(
        'postgres_changes' as const,
        {
          event: 'INSERT' as const,
          schema: 'public',
          table: this.tableName,
          filter: `user_id=eq.${userId}`,
        },
        onInsert
      )
      .subscribe();
    supabaseWrapper.addSubscription(channel);
    return channel;
  }

  public async getUnreadCount(userId: string): Promise<number> {
    const supabase = await this.getSupabaseClient();

    const { count, error } = await supabase
      .from(this.tableName)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return count ?? 0;
  }

  public async getUserNotifications(
    userId: string,
    options: { limit?: number; offset?: number; unreadOnly?: boolean } = {}
  ): Promise<NotificationListResponse> {
    const { limit = 20, offset = 0, unreadOnly = false } = options;
    const supabase = await this.getSupabaseClient();

    // Build query
    let query = supabase
      .from(this.tableName)
      .select(this.defaultSelect, { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, count, error } = await query;

    if (error) throw error;

    // Get unread count separately
    const unreadCount = await this.getUnreadCount(userId);

    return {
      notifications: (data ?? []) as unknown as Notification[],
      unread_count: unreadCount,
      total_count: count ?? 0,
    };
  }

  public async createNotification(dto: CreateNotificationDto): Promise<Notification> {
    const supabase = await this.getSupabaseClient();

    // Set default expiration if not provided (30 days)
    const expiresAt = dto.expires_at ?? (() => {
      const date = new Date();
      date.setDate(date.getDate() + 30);
      return date.toISOString();
    })();

    const { data, error } = await supabase
      .from(this.tableName)
      .insert({
        user_id: dto.user_id,
        tenant_id: dto.tenant_id,
        title: dto.title,
        message: dto.message,
        type: dto.type,
        category: dto.category ?? 'system',
        priority: dto.priority ?? 'normal',
        action_type: dto.action_type ?? 'none',
        action_payload: dto.action_payload,
        metadata: dto.metadata ?? {},
        expires_at: expiresAt,
        is_read: false,
      })
      .select(this.defaultSelect)
      .single();

    if (error) throw error;
    return data as unknown as Notification;
  }

  public async deleteNotification(id: string, userId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();

    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
  }
}