import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from '@/adapters/base.adapter';
import { FinancialTransaction } from '@/models/financialTransaction.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export type IFinancialTransactionAdapter = IBaseAdapter<FinancialTransaction>;

@injectable()
export class FinancialTransactionAdapter
  extends BaseAdapter<FinancialTransaction>
  implements IFinancialTransactionAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }
  protected tableName = 'financial_transactions';

  protected defaultSelect = `
    id,
    type,
    description,
    date,
    budget_id,
    member_id,
    category_id,
    fund_id,
    batch_id,
    account_id,
    accounts_account_id,
    header_id,
    debit,
    credit,
    is_reconciled,
    reconciled_at,
    reconciled_by,
    source_id,
    created_by,
    updated_by,
    created_at,
    updated_at
  `;

  protected defaultRelationships: QueryOptions['relationships'] = [
    {
      table: 'members',
      foreignKey: 'member_id',
      select: ['id', 'first_name', 'last_name', 'email']
    },
    {
      table: 'chart_of_accounts',
      foreignKey: 'account_id',
      select: ['id', 'code', 'name', 'account_type']
    },
    {
      table: 'financial_transaction_headers',
      foreignKey: 'header_id',
      select: ['id', 'transaction_number', 'status']
    },
    {
      table: 'funds',
      foreignKey: 'fund_id',
      select: ['id', 'name', 'type']
    },
    {
      table: 'accounts',
      foreignKey: 'accounts_account_id',
      select: ['id', 'name']
    },
    {
      table: 'financial_sources',
      foreignKey: 'source_id',
      select: ['id', 'name', 'source_type']
    }
  ];

  protected override async onBeforeCreate(
    data: Partial<FinancialTransaction>
  ): Promise<Partial<FinancialTransaction>> {
    const supabase = await this.getSupabaseClient();
    if (data.header_id) {
      const { data: header, error } = await supabase
        .from('financial_transaction_headers')
        .select('status')
        .eq('id', data.header_id)
        .single();
      if (error) throw error;
      if (header && (header.status === 'posted' || header.status === 'voided')) {
        throw new Error('Cannot add transactions to a posted or voided header');
      }
    }
    return data;
  }

  protected override async onAfterCreate(
    data: FinancialTransaction
  ): Promise<void> {
    await this.auditService.logAuditEvent(
      'create',
      'financial_transaction',
      data.id,
      data
    );
  }

  protected override async onBeforeUpdate(
    id: string,
    data: Partial<FinancialTransaction>
  ): Promise<Partial<FinancialTransaction>> {
    const supabase = await this.getSupabaseClient();
    let headerId = data.header_id;
    if (!headerId) {
      const { data: tx, error } = await supabase
        .from(this.tableName)
        .select('header_id')
        .eq('id', id)
        .single();
      if (error) throw error;
      headerId = tx?.header_id;
    }

    if (headerId) {
      const { data: header, error } = await supabase
        .from('financial_transaction_headers')
        .select('status')
        .eq('id', headerId)
        .single();
      if (error) throw error;
      if (header && (header.status === 'posted' || header.status === 'voided')) {
        throw new Error(
          'Cannot modify transactions of a posted or voided header'
        );
      }
    }
    return data;
  }

  protected override async onAfterUpdate(
    data: FinancialTransaction
  ): Promise<void> {
    await this.auditService.logAuditEvent(
      'update',
      'financial_transaction',
      data.id,
      data
    );
  }

  protected override async onBeforeDelete(id: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    const { data: tx, error } = await supabase
      .from(this.tableName)
      .select('header_id')
      .eq('id', id)
      .single();
    if (error) throw error;
    if (tx?.header_id) {
      const { data: header, error: headErr } = await supabase
        .from('financial_transaction_headers')
        .select('status')
        .eq('id', tx.header_id)
        .single();
      if (headErr) throw headErr;
      if (header && (header.status === 'posted' || header.status === 'voided')) {
        throw new Error(
          'Cannot delete transactions of a posted or voided header'
        );
      }
    }
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'financial_transaction', id, {
      id
    });
  }
}
