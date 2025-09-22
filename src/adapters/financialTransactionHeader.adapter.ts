import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, QueryOptions } from './base.adapter';
import { FinancialTransactionHeader } from '../models/financialTransactionHeader.model';
import type { AuditService } from '../services/AuditService';
import { TYPES } from '../lib/types';
import { tenantUtils } from '../utils/tenantUtils';
import { format, parse } from 'date-fns';

export interface IFinancialTransactionHeaderAdapter
  extends BaseAdapter<FinancialTransactionHeader> {
  postTransaction(id: string): Promise<void>;
  submitTransaction(id: string): Promise<void>;
  approveTransaction(id: string): Promise<void>;
  voidTransaction(id: string, reason: string): Promise<void>;
  getTransactionEntries(headerId: string): Promise<any[]>;
  isTransactionBalanced(headerId: string): Promise<boolean>;
  createWithTransactions(
    data: Partial<FinancialTransactionHeader>,
    transactions: any[],
  ): Promise<{ header: FinancialTransactionHeader; transactions: any[] }>;
  updateWithTransactions(
    id: string,
    data: Partial<FinancialTransactionHeader>,
    transactions: any[],
  ): Promise<{ header: FinancialTransactionHeader; transactions: any[] }>;
  getUnmappedHeaders(): Promise<FinancialTransactionHeader[]>;
}

@injectable()
export class FinancialTransactionHeaderAdapter
  extends BaseAdapter<FinancialTransactionHeader>
  implements IFinancialTransactionHeaderAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  private async getTenantId() {
    return this.context?.tenantId ?? (await tenantUtils.getTenantId());
  }
  protected tableName = 'financial_transaction_headers';
  
  protected defaultSelect = `
    id,
    transaction_number,
    transaction_date,
    description,
    reference,
    source_id,
    status,
    posted_at,
    posted_by,
    voided_at,
    voided_by,
    void_reason,
    created_by,
    updated_by,
    created_at,
    updated_at
  `;

  protected defaultRelationships: QueryOptions['relationships'] = [
    {
      table: 'financial_sources',
      foreignKey: 'source_id',
      select: ['id', 'name', 'source_type']
    }
  ];

  protected override async onBeforeCreate(data: Partial<FinancialTransactionHeader>): Promise<Partial<FinancialTransactionHeader>> {
    // Set default values
    if (!data.status) {
      data.status = 'draft';
    }
    
    // Generate transaction number if not provided
    if (!data.transaction_number) {
      data.transaction_number = await this.generateTransactionNumber(
        data.transaction_date || format(new Date(), 'yyyy-MM-dd'),
        data.status ?? 'draft'
      );
    }
    
    return data;
  }

  protected override async onAfterCreate(data: FinancialTransactionHeader): Promise<void> {
    // Log audit event
    await this.auditService.logAuditEvent('create', 'financial_transaction_header', data.id, data);
  }

  protected override async onBeforeUpdate(id: string, data: Partial<FinancialTransactionHeader>): Promise<Partial<FinancialTransactionHeader>> {
    // Get current header data
    const { data: currentHeader, error } = await this.supabase
      .from(this.tableName)
      .select('status')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    // Validate status changes
    if (data.status && currentHeader) {
      if (currentHeader.status === 'posted' && data.status === 'draft') {
        throw new Error('Cannot change status from posted to draft');
      }
      
      if (currentHeader.status === 'voided' && data.status !== 'voided') {
        throw new Error('Cannot change status of a voided transaction');
      }
      
      // If changing to posted, set posted_at and posted_by
      if (data.status === 'posted' && currentHeader.status !== 'posted') {
        data.posted_at = new Date().toISOString();
        const { data: { user } } = await this.supabase.auth.getUser();
        data.posted_by = user?.id;
      }
      
      // If changing to voided, set voided_at and voided_by
      if (data.status === 'voided' && currentHeader.status !== 'voided') {
        data.voided_at = new Date().toISOString();
        const { data: { user } } = await this.supabase.auth.getUser();
        data.voided_by = user?.id;
        
        // Require void reason
        if (!data.void_reason) {
          throw new Error('Void reason is required when voiding a transaction');
        }
      }
    }
    
    return data;
  }

  protected override async onAfterUpdate(data: FinancialTransactionHeader): Promise<void> {
    // Log audit event
    await this.auditService.logAuditEvent('update', 'financial_transaction_header', data.id, data);
  }

  protected override async onBeforeDelete(id: string): Promise<void> {
    // Check status of header before allowing delete
    const { data: header, error: headerError } = await this.supabase
      .from(this.tableName)
      .select('status')
      .eq('id', id)
      .single();

    if (headerError) throw headerError;
    if (header && (header.status === 'posted' || header.status === 'voided')) {
      throw new Error(`Cannot delete a ${header.status} transaction`);
    }

    // Remove all associated transactions for this header
    const tenantId = await this.getTenantId();
    if (!tenantId) throw new Error('No tenant context found');

    const { error: deleteError } = await this.supabase
      .from('financial_transactions')
      .delete()
      .eq('header_id', id)
      .eq('tenant_id', tenantId);

    if (deleteError) throw deleteError;
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    // Log audit event
    await this.auditService.logAuditEvent('delete', 'financial_transaction_header', id, { id });
  }


  private async generateTransactionNumber(date: string, status: string): Promise<string> {
    const prefixMap: Record<string, string> = {
      draft: 'DFT',
      submitted: 'SUB',
      approved: 'APP',
      posted: 'TRX',
      voided: 'TRX'
    };
    const prefix = prefixMap[status] || 'TRX';

    // Format: PREFIX-YYYYMM-SEQUENCE
    const dateObj = new Date(date);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    
    // Get current sequence for this month
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('transaction_number')
      .ilike('transaction_number', `${prefix}-${year}${month}-%`)
      .order('transaction_number', { ascending: false })
      .limit(1);
    
    if (error) throw error;
    
    let sequence = 1;
    if (data && data.length > 0) {
      const lastNumber = data[0].transaction_number;
      const lastSequence = parseInt(lastNumber.split('-')[2]);
      sequence = isNaN(lastSequence) ? 1 : lastSequence + 1;
    }
    
    return `${prefix}-${year}${month}-${String(sequence).padStart(4, '0')}`;
  }

  public async postTransaction(id: string): Promise<void> {
    const { error } = await this.supabase.rpc('post_transaction', {
      p_header_id: id,
      p_user_id: (await this.supabase.auth.getUser()).data.user?.id
    });

    if (error) throw error;
  }

  public async submitTransaction(id: string): Promise<void> {
    const { error } = await this.supabase.rpc('submit_transaction', {
      p_header_id: id,
      p_user_id: (await this.supabase.auth.getUser()).data.user?.id
    });

    if (error) throw error;
  }

  public async approveTransaction(id: string): Promise<void> {
    const { error } = await this.supabase.rpc('approve_transaction', {
      p_header_id: id,
      p_user_id: (await this.supabase.auth.getUser()).data.user?.id
    });

    if (error) throw error;
  }

  public async voidTransaction(id: string, reason: string): Promise<void> {
    const { error } = await this.supabase.rpc('void_transaction', {
      p_header_id: id,
      p_user_id: (await this.supabase.auth.getUser()).data.user?.id,
      p_reason: reason
    });
    
    if (error) throw error;
  }

  public async getTransactionEntries(headerId: string): Promise<any[]> {
    const tenantId = await this.getTenantId();
    if (!tenantId) return [];

    const { data, error } = await this.supabase
      .from('financial_transactions')
      .select(
        `
        id,
        type,
        description,
        date,
        debit,
        credit,
        fund_id,
        fund:fund_id(id, name, type),
        category_id,
        category:category_id(id, name, code),
        account_id,
        accounts_account_id,
        account:chart_of_accounts(id, code, name, account_type),
        account_holder:accounts(id, name),
        source_id,
        source:source_id(id, name, source_type),
        header:financial_transaction_headers(id, deleted_at)
      `
      )
      .eq('tenant_id', tenantId)
      .eq('header_id', headerId)
      .is('financial_transaction_headers.deleted_at', null)
      .order('updated_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  public async isTransactionBalanced(headerId: string): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('is_transaction_balanced', {
      p_header_id: headerId
    });

    if (error) throw error;
    return data;
  }

  public async createWithTransactions(
    data: Partial<FinancialTransactionHeader>,
    transactions: any[],
  ): Promise<{ header: FinancialTransactionHeader; transactions: any[] }> {
    const header = await super.create(data);
    let inserted: any[] = [];
    if (transactions && transactions.length) {
      inserted = await this.insertTransactions(header.id, transactions);
    }
    return { header, transactions: inserted };
  }

  public async updateWithTransactions(
    id: string,
    data: Partial<FinancialTransactionHeader>,
    transactions: any[],
  ): Promise<{ header: FinancialTransactionHeader; transactions: any[] }> {
    const header = await super.update(id, data);
    const inserted = await this.replaceTransactions(id, transactions);
    return { header, transactions: inserted };
  }

  public async getUnmappedHeaders(): Promise<FinancialTransactionHeader[]> {
    const tenantId = await this.getTenantId();
    if (!tenantId) return [];

    const { data, error } = await this.supabase.rpc('get_unmapped_headers', {
      p_tenant_id: tenantId,
    });

    if (error) throw error;
    return data || [];
  }

  private async insertTransactions(headerId: string, entries: any[]): Promise<any[]> {
    const tenantId = await this.getTenantId();
    if (!tenantId) throw new Error('No tenant context found');
    const userId = (await this.supabase.auth.getUser()).data.user?.id;
    const rows = entries.map((e) => ({
      ...e,
      header_id: headerId,
      tenant_id: tenantId,
      created_by: userId,
      updated_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    const { data, error } = await this.supabase
      .from('financial_transactions')
      .insert(rows)
      .select();
    if (error) throw error;
    return data || [];
  }

  private async replaceTransactions(headerId: string, entries: any[]): Promise<any[]> {
    const tenantId = await this.getTenantId();
    if (!tenantId) throw new Error('No tenant context found');
    const userId = (await this.supabase.auth.getUser()).data.user?.id;
    await this.supabase
      .from('financial_transactions')
      .delete()
      .eq('header_id', headerId)
      .eq('tenant_id', tenantId);
    let inserted: any[] = [];
    if (entries && entries.length) {
      const rows = entries.map((e) => ({
        ...e,
        header_id: headerId,
        tenant_id: tenantId,
        created_by: userId,
        updated_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      const { data, error } = await this.supabase
        .from('financial_transactions')
        .insert(rows)
        .select();
      if (error) throw error;
      inserted = data || [];
    }
    return inserted;
  }
}