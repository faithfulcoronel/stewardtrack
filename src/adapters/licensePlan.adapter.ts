import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from '@/adapters/base.adapter';
import { LicensePlan } from '@/models/licensePlan.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export type ILicensePlanAdapter = IBaseAdapter<LicensePlan>;

@injectable()
export class LicensePlanAdapter
  extends BaseAdapter<LicensePlan>
  implements ILicensePlanAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'license_plans';

  protected defaultSelect = `
    id,
    name,
    tier,
    description,
    created_by,
    updated_by,
    created_at,
    updated_at
  `;

  protected defaultRelationships: QueryOptions['relationships'] = [];

  protected override async onAfterCreate(data: LicensePlan): Promise<void> {
    await this.auditService.logAuditEvent('create', 'license_plan', data.id, data);
  }

  protected override async onAfterUpdate(data: LicensePlan): Promise<void> {
    await this.auditService.logAuditEvent('update', 'license_plan', data.id, data);
  }
}
