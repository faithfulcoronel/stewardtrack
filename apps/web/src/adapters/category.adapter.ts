import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from '@/adapters/base.adapter';
import { Category } from '@/models/category.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export type ICategoryAdapter = IBaseAdapter<Category>;

@injectable()
export class CategoryAdapter
  extends BaseAdapter<Category>
  implements ICategoryAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'categories';

  protected defaultSelect = `
    id,
    type,
    code,
    name,
    description,
    is_system,
    is_active,
    sort_order,
    chart_of_account_id,
    fund_id,
    created_by,
    updated_by,
    created_at,
    updated_at
  `;

  protected defaultRelationships: QueryOptions['relationships'] = [
    {
      table: 'chart_of_accounts',
      foreignKey: 'chart_of_account_id',
      select: ['id', 'code', 'name', 'account_type']
    },
    { table: 'funds', foreignKey: 'fund_id', select: ['id', 'code', 'name', 'type'] }
  ];

  protected override async onBeforeCreate(data: Partial<Category>): Promise<Partial<Category>> {
    if (data.is_active === undefined) {
      data.is_active = true;
    }
    return data;
  }

  protected override async onAfterCreate(data: Category): Promise<void> {
    await this.auditService.logAuditEvent('create', 'category', data.id, data);
  }

  protected override async onAfterUpdate(data: Category): Promise<void> {
    await this.auditService.logAuditEvent('update', 'category', data.id, data);
  }

  protected override async onBeforeDelete(id: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    const { data: tx, error } = await supabase
      .from('financial_transactions')
      .select('id')
      .eq('category_id', id)
      .limit(1);
    if (error) throw error;
    if (tx?.length) {
      throw new Error('Cannot delete category with existing financial transactions');
    }
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'category', id, { id });
  }
}
