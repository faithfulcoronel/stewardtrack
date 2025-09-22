import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from './base.adapter';
import { Fund } from '../models/fund.model';
import type { AuditService } from '../services/AuditService';
import { TYPES } from '../lib/types';

export type IFundAdapter = IBaseAdapter<Fund>;

@injectable()
export class FundAdapter
  extends BaseAdapter<Fund>
  implements IFundAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }
  protected tableName = 'funds';

  protected defaultSelect = `
    id,
    code,
    name,
    description,
    type,
    coa_id,
    created_by,
    updated_by,
    created_at,
    updated_at
  `;

  protected defaultRelationships: QueryOptions['relationships'] = [
    {
      table: 'chart_of_accounts',
      foreignKey: 'coa_id',
      select: ['id', 'code', 'name']
    }
  ];

  protected override async onAfterCreate(data: Fund): Promise<void> {
    await this.auditService.logAuditEvent('create', 'fund', data.id, data);
  }

  protected override async onAfterUpdate(data: Fund): Promise<void> {
    await this.auditService.logAuditEvent('update', 'fund', data.id, data);
  }

  protected override async onBeforeDelete(id: string): Promise<void> {
    const { data: tx, error } = await this.supabase
      .from('financial_transactions')
      .select('id')
      .eq('fund_id', id)
      .limit(1);
    if (error) throw error;
    if (tx?.length) {
      throw new Error('Cannot delete fund with existing financial transactions');
    }
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('funds')
      .select('coa_id')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    const coaId = data?.coa_id;
    if (coaId) {
      const { error: delErr } = await this.supabase
        .from('chart_of_accounts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', coaId);
      if (delErr) throw delErr;
    }
    await this.auditService.logAuditEvent('delete', 'fund', id, { id });
  }
}
