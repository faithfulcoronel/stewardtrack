import 'reflect-metadata';
import { injectable } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from './base.adapter';
import { Notification } from '../models/notification.model';
import { supabaseWrapper } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface INotificationAdapter extends IBaseAdapter<Notification> {
  markAsRead(id: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
  deleteExpired(): Promise<void>;
  subscribeToUserNotifications(
    userId: string,
    onInsert: () => void
  ): RealtimeChannel;
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
    title,
    message,
    type,
    is_read,
    action_type,
    action_payload,
    created_at,
    tenant_id
  `;

  public async markAsRead(id: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .update({ is_read: true })
      .eq('id', id);

    if (error) throw error;
  }

  public async markAllAsRead(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
  }

  public async deleteExpired(): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) throw error;
  }

  protected override async buildSecureQuery(options: QueryOptions = {}): Promise<any> {
    const { query } = await super.buildSecureQuery(options);
    
    // Add user_id filter if not already present
    if (!options.filters?.user_id) {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (user) {
        query.eq('user_id', user.id);
      }
    }

    return { query };
  }

  public subscribeToUserNotifications(
    userId: string,
    onInsert: () => void
  ): RealtimeChannel {
    const channel = this.supabase
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
}