import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from './base.adapter';
import { MenuItem } from '../models/menuItem.model';
import type { AuditService } from '../services/AuditService';
import { TYPES } from '../lib/types';

export type IMenuItemAdapter = IBaseAdapter<MenuItem>;

@injectable()
export class MenuItemAdapter
  extends BaseAdapter<MenuItem>
  implements IMenuItemAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'menu_items';

  protected defaultSelect = `
    id,
    parent_id,
    code,
    label,
    path,
    icon,
    sort_order,
    is_system,
    section,
    permission_key,
    feature_key,
    created_by,
    updated_by,
    created_at,
    updated_at
  `;

  protected defaultRelationships: QueryOptions['relationships'] = [
    {
      table: 'role_menu_items',
      foreignKey: 'menu_item_id',
      select: ['role_id'],
    },
  ];

  protected override async onAfterCreate(data: MenuItem): Promise<void> {
    await this.auditService.logAuditEvent('create', 'menu_item', data.id, data);
  }

  protected override async onAfterUpdate(data: MenuItem): Promise<void> {
    await this.auditService.logAuditEvent('update', 'menu_item', data.id, data);
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'menu_item', id, { id });
  }
}
