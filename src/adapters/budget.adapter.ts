import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from './base.adapter';
import { Budget } from '../models/budget.model';
import type { AuditService } from '../services/AuditService';
import { TYPES } from '../lib/types';

export type IBudgetAdapter = IBaseAdapter<Budget>;

@injectable()
export class BudgetAdapter extends BaseAdapter<Budget> implements IBudgetAdapter {
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'budgets';

  protected defaultSelect = `
    id,
    name,
    amount,
    category_id,
    description,
    start_date,
    end_date,
    created_by,
    updated_by,
    created_at,
    updated_at
  `;

  protected defaultRelationships: QueryOptions['relationships'] = [
    {
      table: 'categories',
      foreignKey: 'category_id',
      select: ['id', 'name']
    }
  ];

  protected override async onAfterCreate(data: Budget): Promise<void> {
    await this.auditService.logAuditEvent('create', 'budget', data.id, data);
  }

  protected override async onAfterUpdate(data: Budget): Promise<void> {
    await this.auditService.logAuditEvent('update', 'budget', data.id, data);
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'budget', id, { id });
  }
}
