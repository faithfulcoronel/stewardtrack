import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { LicensePlan } from '@/models/licensePlan.model';
import { NotificationService } from '@/services/NotificationService';
import { TYPES } from '@/lib/types';
import type { ILicensePlanAdapter } from '@/adapters/licensePlan.adapter';

export type ILicensePlanRepository = BaseRepository<LicensePlan>;

@injectable()
export class LicensePlanRepository
  extends BaseRepository<LicensePlan>
  implements ILicensePlanRepository
{
  constructor(@inject(TYPES.ILicensePlanAdapter) adapter: ILicensePlanAdapter) {
    super(adapter);
  }

  protected override async afterCreate(data: LicensePlan): Promise<void> {
    NotificationService.showSuccess(
      `Feature package "${data.name}" created successfully`
    );
  }

  protected override async afterUpdate(data: LicensePlan): Promise<void> {
    NotificationService.showSuccess(
      `Feature package "${data.name}" updated successfully`
    );
  }
}
