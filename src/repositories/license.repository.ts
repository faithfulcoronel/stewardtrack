import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { BaseAdapter } from '@/adapters/base.adapter';
import { License } from '@/models/license.model';
import { LicenseValidator } from '@/validators/license.validator';
import { NotificationService } from '@/services/NotificationService';
import { TYPES } from '@/lib/types';

export type ILicenseRepository = BaseRepository<License>;

@injectable()
export class LicenseRepository
  extends BaseRepository<License>
  implements ILicenseRepository
{
  constructor(@inject(TYPES.ILicenseAdapter) adapter: BaseAdapter<License>) {
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
    NotificationService.showSuccess(`License "${data.plan_name}" created successfully`);
  }

  protected override async afterUpdate(data: License): Promise<void> {
    NotificationService.showSuccess(`License "${data.plan_name}" updated successfully`);
  }
}
