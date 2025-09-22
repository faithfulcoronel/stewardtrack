import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from './base.adapter';
import { MenuPermission } from '../models/menuPermission.model';
import type { AuditService } from '../services/AuditService';
import { TYPES } from '../lib/types';

export type IMenuPermissionAdapter = IBaseAdapter<MenuPermission>;

@injectable()
export class MenuPermissionAdapter
  extends BaseAdapter<MenuPermission>
  implements IMenuPermissionAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'menu_permissions';

  protected defaultSelect = `
    id,
    menu_item_id,
    permission_id,
    created_by,
    updated_by,
    created_at,
    updated_at
  `;

  protected override async onAfterCreate(data: MenuPermission): Promise<void> {
    await this.auditService.logAuditEvent('create', 'menu_permission', data.id, data);
  }

  protected override async onAfterUpdate(data: MenuPermission): Promise<void> {
    await this.auditService.logAuditEvent('update', 'menu_permission', data.id, data);
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'menu_permission', id, { id });
  }
}
