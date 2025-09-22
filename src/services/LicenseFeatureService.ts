import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { ILicenseRepository } from '@/repositories/license.repository';
import type { ILicenseFeatureRepository } from '@/repositories/licenseFeature.repository';

@injectable()
export class LicenseFeatureService {
  constructor(
    @inject(TYPES.ILicenseRepository)
    private licenseRepo: ILicenseRepository,
    @inject(TYPES.ILicenseFeatureRepository)
    private featureRepo: ILicenseFeatureRepository,
  ) {}

  async getActiveFeatures(date: string = new Date().toISOString().slice(0, 10)) {
    const { data: licenses } = await this.licenseRepo.findAll({
      select: 'plan_name,status,expires_at',
    });

    const plans = (licenses || [])
      .filter(l => l.status === 'active' && (!l.expires_at || l.expires_at >= date))
      .map(l => l.plan_name);

    if (plans.length === 0) return [] as any[];

    const { data } = await this.featureRepo.findAll({
      select: 'plan_name,feature_key',
      filters: {
        plan_name: { operator: 'isAnyOf', value: plans },
      },
    });

    return data || [];
  }
}
