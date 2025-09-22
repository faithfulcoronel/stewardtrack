import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from './base.adapter';
import { Account } from '../models/account.model';
import type { AuditService } from '../services/AuditService';
import { TYPES } from '../lib/types';

export type IAccountAdapter = IBaseAdapter<Account>;

@injectable()
export class AccountAdapter
  extends BaseAdapter<Account>
  implements IAccountAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }
  protected tableName = 'accounts';
  
  protected defaultSelect = `
    id,
    name,
    account_type,
    account_number,
    description,
    email,
    phone,
    address,
    website,
    tax_id,
    is_active,
    notes,
    member_id,
    created_by,
    updated_by,
    created_at,
    updated_at
  `;

  protected defaultRelationships: QueryOptions['relationships'] = [
    {
      table: 'members',
      foreignKey: 'member_id',
      select: ['id', 'first_name', 'last_name', 'email', 'contact_number']
    }
  ];

  protected override async onBeforeCreate(data: Partial<Account>): Promise<Partial<Account>> {
    // Set default values
    if (data.is_active === undefined) {
      data.is_active = true;
    }
    
    return data;
  }

  protected override async onAfterCreate(data: Account): Promise<void> {
    // Log audit event
    await this.auditService.logAuditEvent('create', 'account', data.id, data);
  }

  protected override async onBeforeUpdate(id: string, data: Partial<Account>): Promise<Partial<Account>> {
    // Repositories perform validation
    return data;
  }

  protected override async onAfterUpdate(data: Account): Promise<void> {
    // Log audit event
    await this.auditService.logAuditEvent('update', 'account', data.id, data);
  }

  protected override async onBeforeDelete(id: string): Promise<void> {
    // Check for financial transactions
    const { data: transactions, error: transactionsError } = await this.supabase
      .from('financial_transactions')
      .select('id')
      .eq('account_id', id)
      .limit(1);

    if (transactionsError) throw transactionsError;
    if (transactions?.length) {
      throw new Error('Cannot delete account with existing financial transactions');
    }
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    // Log audit event
    await this.auditService.logAuditEvent('delete', 'account', id, { id });
  }

}