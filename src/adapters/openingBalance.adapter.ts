import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { OpeningBalance } from '@/models/openingBalance.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export type IOpeningBalanceAdapter = IBaseAdapter<OpeningBalance>;

@injectable()
export class OpeningBalanceAdapter
  extends BaseAdapter<OpeningBalance>
  implements IOpeningBalanceAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'fund_opening_balances';

  protected defaultSelect = `
    id,
    fiscal_year_id,
    fund_id,
    source_id,
    amount,
    source,
    status,
    header_id,
    posted_at,
    posted_by,
    created_by,
    updated_by,
    created_at,
    updated_at
  `;

  protected defaultRelationships = [
    {
      table: 'fiscal_years',
      foreignKey: 'fiscal_year_id',
      select: ['id', 'name']
    },
    {
      table: 'funds',
      foreignKey: 'fund_id',
      select: ['id', 'name', 'code']
    },
    {
      table: 'financial_sources',
      foreignKey: 'source_id',
      alias: 'financial_source',
      select: ['id', 'name', 'source_type']
    }
  ];

  protected override async onAfterCreate(data: OpeningBalance): Promise<void> {
    await this.auditService.logAuditEvent('create', 'opening_balance', data.id, data);
  }

  protected override async onAfterUpdate(data: OpeningBalance): Promise<void> {
    await this.auditService.logAuditEvent('update', 'opening_balance', data.id, data);
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'opening_balance', id, { id });
  }
}
