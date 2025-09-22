import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from '@/adapters/base.adapter';
import { LicenseFeature } from '@/models/licenseFeature.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export type ILicenseFeatureAdapter = IBaseAdapter<LicenseFeature>;

@injectable()
export class LicenseFeatureAdapter
  extends BaseAdapter<LicenseFeature>
  implements ILicenseFeatureAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'license_features';

  protected defaultSelect = `
    id,
    tenant_id,
    license_id,
    feature,
    plan_name,
    feature_key,
    created_by,
    updated_by,
    created_at,
    updated_at
  `;

  protected defaultRelationships: QueryOptions['relationships'] = [];

  protected override async onAfterCreate(data: LicenseFeature): Promise<void> {
    await this.auditService.logAuditEvent('create', 'license_feature', data.id, data);
  }

  protected override async onAfterUpdate(data: LicenseFeature): Promise<void> {
    await this.auditService.logAuditEvent('update', 'license_feature', data.id, data);
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'license_feature', id, { id });
  }
}
