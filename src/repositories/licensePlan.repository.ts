import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { BaseAdapter } from '@/adapters/base.adapter';
import { LicensePlan } from '@/models/licensePlan.model';
import { NotificationService } from '@/services/NotificationService';
import { TYPES } from '@/lib/types';

export type ILicensePlanRepository = BaseRepository<LicensePlan>;

@injectable()
export class LicensePlanRepository
  extends BaseRepository<LicensePlan>
  implements ILicensePlanRepository
{
  constructor(@inject(TYPES.ILicensePlanAdapter) adapter: BaseAdapter<LicensePlan>) {
    super(adapter);
  }

  protected override async afterCreate(data: LicensePlan): Promise<void> {
    NotificationService.showSuccess(
      `License plan "${data.name}" created successfully`
    );
  }

  protected override async afterUpdate(data: LicensePlan): Promise<void> {
    NotificationService.showSuccess(
      `License plan "${data.name}" updated successfully`
    );
  }
}
