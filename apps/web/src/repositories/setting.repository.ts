import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { Setting } from '@/models/setting.model';
import { SettingValidator } from '@/validators/setting.validator';
import { TYPES } from '@/lib/types';
import type { ISettingAdapter } from '@/adapters/setting.adapter';

export interface ISettingRepository extends BaseRepository<Setting> {
  getByKey(key: string): Promise<Setting | null>;
  getSystemSettings(keyPrefix: string): Promise<Setting[]>;
  upsertSystemSetting(key: string, value: string): Promise<Setting>;
}

@injectable()
export class SettingRepository
  extends BaseRepository<Setting>
  implements ISettingRepository
{
  private settingAdapter: ISettingAdapter;

  constructor(@inject(TYPES.ISettingAdapter) adapter: ISettingAdapter) {
    super(adapter);
    this.settingAdapter = adapter;
  }

  async getByKey(key: string): Promise<Setting | null> {
    const { data } = await this.find({
      filters: { key: { operator: 'eq', value: key } },
      pagination: { page: 1, pageSize: 1 },
    });
    return data?.[0] || null;
  }

  /**
   * Get system-level settings (tenant_id IS NULL) by key prefix.
   * Used for system-wide configuration like email settings.
   */
  async getSystemSettings(keyPrefix: string): Promise<Setting[]> {
    return this.settingAdapter.getSystemSettings(keyPrefix);
  }

  /**
   * Upsert a system-level setting (tenant_id = NULL).
   */
  async upsertSystemSetting(key: string, value: string): Promise<Setting> {
    return this.settingAdapter.upsertSystemSetting(key, value);
  }

  protected override async beforeCreate(data: Partial<Setting>): Promise<Partial<Setting>> {
    SettingValidator.validate(data);
    return data;
  }

  protected override async beforeUpdate(id: string, data: Partial<Setting>): Promise<Partial<Setting>> {
    SettingValidator.validate(data);
    return data;
  }
}
