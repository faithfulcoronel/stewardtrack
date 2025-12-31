import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from '@/adapters/base.adapter';
import { License } from '@/models/license.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export type ILicenseAdapter = IBaseAdapter<License>;

@injectable()
export class LicenseAdapter
  extends BaseAdapter<License>
  implements ILicenseAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'tenant_feature_grants';

  protected defaultSelect = `
    id,
    tenant_id,
    feature_id,
    grant_source,
    package_id,
    source_reference,
    starts_at,
    expires_at,
    created_by,
    updated_by,
    created_at,
    updated_at
  `;

  protected defaultRelationships: QueryOptions['relationships'] = [];

  protected override async onAfterCreate(data: License): Promise<void> {
    await this.auditService.logAuditEvent('create', 'tenant_feature_grant', data.id, data);
  }

  protected override async onAfterUpdate(data: License): Promise<void> {
    await this.auditService.logAuditEvent('update', 'tenant_feature_grant', data.id, data);
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'tenant_feature_grant', id, { id });
  }
}
