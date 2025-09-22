import { injectable, inject } from 'inversify';
import { BaseRepository } from './base.repository';
import { BaseAdapter } from '../adapters/base.adapter';
import { Setting } from '../models/setting.model';
import type { ISettingAdapter } from '../adapters/setting.adapter';
import { SettingValidator } from '../validators/setting.validator';

export interface ISettingRepository extends BaseRepository<Setting> {
  getByKey(key: string): Promise<Setting | null>;
}

@injectable()
export class SettingRepository
  extends BaseRepository<Setting>
  implements ISettingRepository
{
  constructor(@inject('ISettingAdapter') adapter: BaseAdapter<Setting>) {
    super(adapter);
  }

  async getByKey(key: string): Promise<Setting | null> {
    const { data } = await this.find({
      filters: { key: { operator: 'eq', value: key } },
      pagination: { page: 1, pageSize: 1 },
    });
    return data?.[0] || null;
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
