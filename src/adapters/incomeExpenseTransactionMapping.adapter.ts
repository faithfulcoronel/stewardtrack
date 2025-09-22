import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from '@/adapters/base.adapter';
import { IncomeExpenseTransactionMapping } from '@/models/incomeExpenseTransactionMapping.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export interface IIncomeExpenseTransactionMappingAdapter extends IBaseAdapter<IncomeExpenseTransactionMapping> {
  getByTransactionId(id: string): Promise<IncomeExpenseTransactionMapping[]>;
  getByHeaderId(id: string): Promise<IncomeExpenseTransactionMapping[]>;
}

@injectable()
export class IncomeExpenseTransactionMappingAdapter
  extends BaseAdapter<IncomeExpenseTransactionMapping>
  implements IIncomeExpenseTransactionMappingAdapter {
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'income_expense_transaction_mappings';

  protected defaultSelect = `
    id,
    transaction_id,
    transaction_header_id,
    debit_transaction_id,
    credit_transaction_id,
    created_at,
    updated_at
  `;

  protected defaultRelationships: QueryOptions['relationships'] = [
    {
      table: 'financial_transactions',
      foreignKey: 'debit_transaction_id',
      alias: 'debit_transaction',
      select: ['id', 'account_id', 'debit', 'credit']
    },
    {
      table: 'financial_transactions',
      foreignKey: 'credit_transaction_id',
      alias: 'credit_transaction',
      select: ['id', 'account_id', 'debit', 'credit']
    }
  ];

  public async getByTransactionId(
    id: string
  ): Promise<IncomeExpenseTransactionMapping[]> {
    const result = await this.fetch({
      filters: { transaction_id: { operator: 'eq', value: id } }
    });
    return result.data;
  }

  public async getByHeaderId(
    id: string
  ): Promise<IncomeExpenseTransactionMapping[]> {
    const result = await this.fetch({
      filters: { transaction_header_id: { operator: 'eq', value: id } }
    });
    return result.data;
  }

  protected override async onAfterCreate(
    data: IncomeExpenseTransactionMapping
  ): Promise<void> {
    await this.auditService.logAuditEvent(
      'create',
      'income_expense_transaction_mapping',
      data.id,
      data
    );
  }

  protected override async onAfterUpdate(
    data: IncomeExpenseTransactionMapping
  ): Promise<void> {
    await this.auditService.logAuditEvent(
      'update',
      'income_expense_transaction_mapping',
      data.id,
      data
    );
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent(
      'delete',
      'income_expense_transaction_mapping',
      id,
      { id }
    );
  }
}
