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

  protected tableName = 'feature_catalog';

  protected defaultSelect = `
    id,
    code,
    name,
    category,
    description,
    phase,
    is_delegatable,
    is_active,
    created_by,
    updated_by,
    created_at,
    updated_at
  `;

  protected defaultRelationships: QueryOptions['relationships'] = [];

  protected override async onAfterCreate(data: LicenseFeature): Promise<void> {
    await this.auditService.logAuditEvent('create', 'feature_catalog', data.id, data);
  }

  protected override async onAfterUpdate(data: LicenseFeature): Promise<void> {
    await this.auditService.logAuditEvent('update', 'feature_catalog', data.id, data);
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'feature_catalog', id, { id });
  }
}
