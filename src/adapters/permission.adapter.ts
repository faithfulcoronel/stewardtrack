import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from './base.adapter';
import { Permission } from '../models/permission.model';
import type { AuditService } from '../services/AuditService';
import { TYPES } from '../lib/types';

export type IPermissionAdapter = IBaseAdapter<Permission>;

@injectable()
export class PermissionAdapter
  extends BaseAdapter<Permission>
  implements IPermissionAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'permissions';

  protected defaultSelect = `
    id,
    code,
    name,
    description,
    module,
    created_by,
    updated_by,
    created_at,
    updated_at
  `;

  protected override async onBeforeDelete(id: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('menu_permissions')
      .select('menu_item_id')
      .eq('permission_id', id)
      .limit(1);
    if (error) throw error;
    if (data?.length) {
      throw new Error('Cannot delete permission with assigned menu items');
    }
  }

  protected override async onAfterCreate(data: Permission): Promise<void> {
    await this.auditService.logAuditEvent('create', 'permission', data.id, data);
  }

  protected override async onAfterUpdate(data: Permission): Promise<void> {
    await this.auditService.logAuditEvent('update', 'permission', data.id, data);
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'permission', id, { id });
  }
}
