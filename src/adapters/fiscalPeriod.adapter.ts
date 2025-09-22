import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from '@/adapters/base.adapter';
import { FiscalPeriod } from '@/models/fiscalPeriod.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export type IFiscalPeriodAdapter = IBaseAdapter<FiscalPeriod>;

@injectable()
export class FiscalPeriodAdapter
  extends BaseAdapter<FiscalPeriod>
  implements IFiscalPeriodAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'fiscal_periods';

  protected defaultSelect = `
    id,
    tenant_id,
    fiscal_year_id,
    name,
    start_date,
    end_date,
    status,
    closed_at,
    closed_by,
    created_by,
    updated_by,
    created_at,
    updated_at
  `;

  protected defaultRelationships: QueryOptions['relationships'] = [
    {
      table: 'fiscal_years',
      foreignKey: 'fiscal_year_id',
      select: ['id', 'name']
    }
  ];

  protected override async onAfterCreate(data: FiscalPeriod): Promise<void> {
    await this.auditService.logAuditEvent('create', 'fiscal_period', data.id, data);
  }

  protected override async onAfterUpdate(data: FiscalPeriod): Promise<void> {
    await this.auditService.logAuditEvent('update', 'fiscal_period', data.id, data);
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'fiscal_period', id, { id });
  }
}
