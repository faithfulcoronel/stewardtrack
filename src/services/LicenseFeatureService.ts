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

  async getActiveFeatures(
    tenantId: string,
    date: string = new Date().toISOString().slice(0, 10),
  ) {
    const { data: grants } = await this.licenseRepo.findAll({
      select: 'feature_id,grant_source,package_id,starts_at,expires_at',
      filters: {
        tenant_id: { operator: 'eq', value: tenantId },
      },
    });

    const activeGrants = (grants || []).filter(grant => {
      const starts = grant.starts_at ? grant.starts_at <= date : true;
      const expires = grant.expires_at ? grant.expires_at >= date : true;
      return starts && expires;
    });

    if (activeGrants.length === 0) {
      return [] as any[];
    }

    const featureIds = Array.from(new Set(activeGrants.map(grant => grant.feature_id)));
    const { data: catalog } = await this.featureRepo.findAll({
      select: 'id,code,name,category,phase',
      filters: {
        id: { operator: 'isAnyOf', value: featureIds },
      },
    });

    return activeGrants
      .map(grant => {
        const feature = catalog?.find(entry => entry.id === grant.feature_id);
        if (!feature) return null;
        return {
          tenant_id: tenantId,
          feature_id: grant.feature_id,
          feature_code: feature.code,
          feature_name: feature.name,
          category: feature.category,
          phase: feature.phase,
          grant_source: grant.grant_source,
          package_id: grant.package_id,
          starts_at: grant.starts_at,
          expires_at: grant.expires_at,
        };
      })
      .filter(Boolean);
  }
}
