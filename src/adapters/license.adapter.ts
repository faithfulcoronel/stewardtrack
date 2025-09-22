import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from './base.adapter';
import { License } from '../models/license.model';
import type { AuditService } from '../services/AuditService';
import { TYPES } from '../lib/types';

export type ILicenseAdapter = IBaseAdapter<License>;

@injectable()
export class LicenseAdapter
  extends BaseAdapter<License>
  implements ILicenseAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'licenses';

  protected defaultSelect = `
    id,
    tenant_id,
    plan_name,
    tier,
    status,
    starts_at,
    expires_at,
    created_by,
    updated_by,
    created_at,
    updated_at
  `;

  protected defaultRelationships: QueryOptions['relationships'] = [];

  protected override async onAfterCreate(data: License): Promise<void> {
    await this.auditService.logAuditEvent('create', 'license', data.id, data);
  }

  protected override async onAfterUpdate(data: License): Promise<void> {
    await this.auditService.logAuditEvent('update', 'license', data.id, data);
  }

  protected override async onBeforeDelete(id: string): Promise<void> {
    const { data: rows, error } = await this.supabase
      .from('license_features')
      .select('id')
      .eq('license_id', id)
      .limit(1);
    if (error) throw error;
    if (rows?.length) {
      throw new Error('Cannot delete license with existing features');
    }
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'license', id, { id });
  }
}
