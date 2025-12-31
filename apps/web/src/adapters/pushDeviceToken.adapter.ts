/**
 * ================================================================================
 * PUSH DEVICE TOKEN ADAPTER
 * ================================================================================
 *
 * Data access layer for managing push notification device tokens.
 * Handles CRUD operations for FCM tokens across web, iOS, and Android devices.
 *
 * ================================================================================
 */

import 'server-only';
import 'reflect-metadata';
import { injectable } from 'inversify';
import { BaseAdapter } from '@/adapters/base.adapter';
import type { PushDeviceToken, CreatePushDeviceTokenDto, UpdatePushDeviceTokenDto } from '@/models/notification/pushDeviceToken.model';

export interface IPushDeviceTokenAdapter {
  findByUserId(userId: string): Promise<PushDeviceToken[]>;
  findActiveByUserId(userId: string): Promise<PushDeviceToken[]>;
  findByToken(token: string): Promise<PushDeviceToken | null>;
  findById(tokenId: string): Promise<PushDeviceToken | null>;
  upsert(userId: string, tenantId: string, dto: CreatePushDeviceTokenDto): Promise<PushDeviceToken>;
  updateToken(tokenId: string, dto: UpdatePushDeviceTokenDto): Promise<PushDeviceToken | null>;
  deactivate(tokenId: string): Promise<boolean>;
  deleteByToken(token: string): Promise<boolean>;
  deleteAllByUserId(userId: string): Promise<number>;
  findByUserIds(userIds: string[]): Promise<PushDeviceToken[]>;
  updateLastUsed(tokenId: string): Promise<void>;
}

@injectable()
export class PushDeviceTokenAdapter
  extends BaseAdapter<PushDeviceToken>
  implements IPushDeviceTokenAdapter
{
  protected tableName = 'push_device_tokens';

  protected defaultSelect = `
    id,
    user_id,
    tenant_id,
    token,
    device_type,
    device_name,
    browser_info,
    is_active,
    last_used_at,
    created_at,
    updated_at
  `;

  async findByUserId(userId: string): Promise<PushDeviceToken[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as unknown as PushDeviceToken[];
  }

  async findActiveByUserId(userId: string): Promise<PushDeviceToken[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('last_used_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as unknown as PushDeviceToken[];
  }

  async findByToken(token: string): Promise<PushDeviceToken | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('token', token)
      .maybeSingle();

    if (error) throw error;
    return data as PushDeviceToken | null;
  }

  async findById(tokenId: string): Promise<PushDeviceToken | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('id', tokenId)
      .maybeSingle();

    if (error) throw error;
    return data as PushDeviceToken | null;
  }

  async upsert(
    userId: string,
    tenantId: string,
    dto: CreatePushDeviceTokenDto
  ): Promise<PushDeviceToken> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .upsert(
        {
          user_id: userId,
          tenant_id: tenantId,
          token: dto.token,
          device_type: dto.device_type,
          device_name: dto.device_name ?? null,
          browser_info: dto.browser_info ?? null,
          is_active: true,
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,token',
        }
      )
      .select(this.defaultSelect)
      .single();

    if (error) throw error;
    return data as unknown as PushDeviceToken;
  }

  async updateToken(
    tokenId: string,
    dto: UpdatePushDeviceTokenDto
  ): Promise<PushDeviceToken | null> {
    const supabase = await this.getSupabaseClient();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.device_name !== undefined) updateData.device_name = dto.device_name;
    if (dto.browser_info !== undefined) updateData.browser_info = dto.browser_info;
    if (dto.is_active !== undefined) updateData.is_active = dto.is_active;

    const { data, error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', tokenId)
      .select(this.defaultSelect)
      .maybeSingle();

    if (error) throw error;
    return data as PushDeviceToken | null;
  }

  async deactivate(tokenId: string): Promise<boolean> {
    const supabase = await this.getSupabaseClient();

    const { error, count } = await supabase
      .from(this.tableName)
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tokenId);

    if (error) throw error;
    return (count ?? 0) > 0;
  }

  async deleteByToken(token: string): Promise<boolean> {
    const supabase = await this.getSupabaseClient();

    const { error, count } = await supabase
      .from(this.tableName)
      .delete()
      .eq('token', token);

    if (error) throw error;
    return (count ?? 0) > 0;
  }

  async deleteAllByUserId(userId: string): Promise<number> {
    const supabase = await this.getSupabaseClient();

    const { error, count } = await supabase
      .from(this.tableName)
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
    return count ?? 0;
  }

  async findByUserIds(userIds: string[]): Promise<PushDeviceToken[]> {
    if (userIds.length === 0) return [];

    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .in('user_id', userIds)
      .eq('is_active', true);

    if (error) throw error;
    return (data ?? []) as unknown as PushDeviceToken[];
  }

  async updateLastUsed(tokenId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();

    const { error } = await supabase
      .from(this.tableName)
      .update({
        last_used_at: new Date().toISOString(),
      })
      .eq('id', tokenId);

    if (error) throw error;
  }
}
