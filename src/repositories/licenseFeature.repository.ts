import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { BaseAdapter } from '@/adapters/base.adapter';
import { LicenseFeature } from '@/models/licenseFeature.model';
import { LicenseFeatureValidator } from '@/validators/licenseFeature.validator';
import { NotificationService } from '@/services/NotificationService';
import { TYPES } from '@/lib/types';

export type ILicenseFeatureRepository = BaseRepository<LicenseFeature>;

@injectable()
export class LicenseFeatureRepository
  extends BaseRepository<LicenseFeature>
  implements ILicenseFeatureRepository
{
  constructor(@inject(TYPES.ILicenseFeatureAdapter) adapter: BaseAdapter<LicenseFeature>) {
    super(adapter);
  }

  protected override async beforeCreate(data: Partial<LicenseFeature>): Promise<Partial<LicenseFeature>> {
    LicenseFeatureValidator.validate(data);
    return data;
  }

  protected override async beforeUpdate(id: string, data: Partial<LicenseFeature>): Promise<Partial<LicenseFeature>> {
    LicenseFeatureValidator.validate(data);
    return data;
  }

  protected override async afterCreate(_data: LicenseFeature): Promise<void> {
    NotificationService.showSuccess('License feature created successfully');
  }

  protected override async afterUpdate(_data: LicenseFeature): Promise<void> {
    NotificationService.showSuccess('License feature updated successfully');
  }
}
