import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { RoleMenuItem } from '@/models/roleMenuItem.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';
import { tenantUtils } from '@/utils/tenantUtils';
import { handleSupabaseError } from '@/utils/supabaseErrorHandler';

export interface IRoleMenuItemAdapter extends IBaseAdapter<RoleMenuItem> {
  replaceRoleMenuItems(roleId: string, menuItemIds: string[]): Promise<void>;
}

@injectable()
export class RoleMenuItemAdapter
  extends BaseAdapter<RoleMenuItem>
  implements IRoleMenuItemAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  private async getTenantId() {
    return this.context?.tenantId ?? (await tenantUtils.getTenantId());
  }

  protected tableName = 'role_menu_items';

  protected defaultSelect = `
    id,
    role_id,
    menu_item_id,
    created_by,
    updated_by,
    created_at,
    updated_at
  `;

  protected override async onAfterCreate(data: RoleMenuItem): Promise<void> {
    await this.auditService.logAuditEvent('create', 'role_menu_item', data.id, data);
  }

  protected override async onAfterUpdate(data: RoleMenuItem): Promise<void> {
    await this.auditService.logAuditEvent('update', 'role_menu_item', data.id, data);
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'role_menu_item', id, { id });
  }

  async replaceRoleMenuItems(roleId: string, menuItemIds: string[]): Promise<void> {
    const tenantId = await this.getTenantId();
    if (!tenantId) {
      throw new Error('No tenant context found');
    }

    const supabase = await this.getSupabaseClient();

    const { error: deleteError } = await supabase
      .from(this.tableName)
      .delete()
      .eq('role_id', roleId)
      .eq('tenant_id', tenantId);

    if (deleteError) handleSupabaseError(deleteError);

    if (menuItemIds.length) {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const rows = menuItemIds.map(mid => ({
        role_id: roleId,
        menu_item_id: mid,
        tenant_id: tenantId,
        created_by: userId,
        created_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase
        .from(this.tableName)
        .insert(rows);

      if (insertError) handleSupabaseError(insertError);
    }
  }
}
