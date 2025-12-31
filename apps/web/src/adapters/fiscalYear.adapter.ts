import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { FiscalYear } from '@/models/fiscalYear.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export type IFiscalYearAdapter = IBaseAdapter<FiscalYear>;

@injectable()
export class FiscalYearAdapter
  extends BaseAdapter<FiscalYear>
  implements IFiscalYearAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'fiscal_years';

  protected defaultSelect = `
    id,
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

  protected override async onAfterCreate(data: FiscalYear): Promise<void> {
    await this.auditService.logAuditEvent('create', 'fiscal_year', data.id, data);
  }

  protected override async onAfterUpdate(data: FiscalYear): Promise<void> {
    await this.auditService.logAuditEvent('update', 'fiscal_year', data.id, data);
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'fiscal_year', id, { id });
  }
}
