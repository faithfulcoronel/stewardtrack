import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { License } from '@/models/license.model';
import { LicenseValidator } from '@/validators/license.validator';
import { NotificationService } from '@/services/NotificationService';
import { TYPES } from '@/lib/types';
import type { ILicenseAdapter } from '@/adapters/license.adapter';

export type ILicenseRepository = BaseRepository<License>;

@injectable()
export class LicenseRepository
  extends BaseRepository<License>
  implements ILicenseRepository
{
  constructor(@inject(TYPES.ILicenseAdapter) adapter: ILicenseAdapter) {
    super(adapter);
  }

  protected override async beforeCreate(data: Partial<License>): Promise<Partial<License>> {
    LicenseValidator.validate(data);
    return data;
  }

  protected override async beforeUpdate(id: string, data: Partial<License>): Promise<Partial<License>> {
    LicenseValidator.validate(data);
    return data;
  }

  protected override async afterCreate(data: License): Promise<void> {
    NotificationService.showSuccess(`Feature grant for feature ${data.feature_id} created successfully`);
  }

  protected override async afterUpdate(data: License): Promise<void> {
    NotificationService.showSuccess(`Feature grant for feature ${data.feature_id} updated successfully`);
  }
}
