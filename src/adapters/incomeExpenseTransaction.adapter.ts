import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, QueryOptions, type IBaseAdapter } from '@/adapters/base.adapter';
import { IncomeExpenseTransaction } from '@/models/incomeExpenseTransaction.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export interface IIncomeExpenseTransactionAdapter
  extends IBaseAdapter<IncomeExpenseTransaction> {
  getByHeaderId(headerId: string): Promise<IncomeExpenseTransaction[]>;
}

@injectable()
export class IncomeExpenseTransactionAdapter
  extends BaseAdapter<IncomeExpenseTransaction>
  implements IIncomeExpenseTransactionAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }
  protected tableName = 'income_expense_transactions';

  protected defaultSelect = `
    id,
    transaction_type,
    transaction_date,
    line,
    amount,
    description,
    reference,
    category_id,
    fund_id,
    source_id,
    account_id,
    header_id,
    created_by,
    updated_by,
    created_at,
    updated_at
  `;

  protected defaultRelationships: QueryOptions['relationships'] = [
    { table: 'categories', foreignKey: 'category_id', select: ['id','code','name'] },
    { table: 'funds', foreignKey: 'fund_id', select: ['id','code','name','type'] },
    {
      table: 'financial_sources',
      foreignKey: 'source_id',
      alias: 'sources',
      select: ['id', 'name', 'source_type']
    },
    { table: 'accounts', foreignKey: 'account_id', select: ['id','name','account_type'] }
  ];

  public async getByHeaderId(headerId: string): Promise<IncomeExpenseTransaction[]> {
    const result = await this.fetch({
      filters: { header_id: { operator: 'eq', value: headerId } },
      order: { column: 'line', ascending: true }
    });
    return result.data;
  }

  protected override async onAfterCreate(data: IncomeExpenseTransaction): Promise<void> {
    await this.auditService.logAuditEvent('create', 'income_expense_transaction', data.id, data);
  }

  protected override async onAfterUpdate(data: IncomeExpenseTransaction): Promise<void> {
    await this.auditService.logAuditEvent('update', 'income_expense_transaction', data.id, data);
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'income_expense_transaction', id, { id });
  }
}
