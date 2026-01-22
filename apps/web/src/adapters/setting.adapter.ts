import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { Setting } from '@/models/setting.model';
import { TYPES } from '@/lib/types';
import type { AuditService } from '@/services/AuditService';

export interface ISettingAdapter extends IBaseAdapter<Setting> {
  getSystemSettings(keyPrefix: string): Promise<Setting[]>;
  upsertSystemSetting(key: string, value: string): Promise<Setting>;
}

@injectable()
export class SettingAdapter
  extends BaseAdapter<Setting>
  implements ISettingAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'settings';

  protected defaultSelect = `
    id,
    tenant_id,
    user_id,
    key,
    value,
    created_by,
    updated_by,
    created_at,
    updated_at,
    deleted_at
  `;

  /**
   * Get system-level settings (tenant_id IS NULL) without tenant context.
   * Used for system-wide configuration like email settings for registration.
   */
  async getSystemSettings(keyPrefix: string): Promise<Setting[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .is('tenant_id', null)
      .is('deleted_at', null)
      .like('key', `${keyPrefix}%`);

    if (error) {
      console.error('[SettingAdapter] Failed to get system settings:', error);
      return [];
    }

    return (data as unknown as Setting[]) || [];
  }

  /**
   * Upsert a system-level setting (tenant_id = NULL).
   * Used for system-wide configuration.
   */
  async upsertSystemSetting(key: string, value: string): Promise<Setting> {
    const supabase = await this.getSupabaseClient();

    // Check if setting exists
    const { data: existing } = await supabase
      .from(this.tableName)
      .select('id')
      .is('tenant_id', null)
      .eq('key', key)
      .is('deleted_at', null)
      .single();

    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from(this.tableName)
        .update({ value, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select(this.defaultSelect)
        .single();

      if (error) {
        throw new Error(`Failed to update system setting: ${error.message}`);
      }
      return data as unknown as Setting;
    } else {
      // Create new
      const { data, error } = await supabase
        .from(this.tableName)
        .insert({
          key,
          value,
          tenant_id: null,
          user_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select(this.defaultSelect)
        .single();

      if (error) {
        throw new Error(`Failed to create system setting: ${error.message}`);
      }
      return data as unknown as Setting;
    }
  }
}
