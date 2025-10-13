import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { UserRole } from '@/models/userRole.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export interface IUserRoleAdapter extends IBaseAdapter<UserRole> {
  getRoleDetailsByUser(
    userId: string,
    tenantId?: string
  ): Promise<{ role_id: string; role_name: string }[]>;
  getAdminRole(userId: string, tenantId: string): Promise<string | null>;
  getRolesWithPermissions(userId: string, tenantId?: string): Promise<any[]>;
  isSuperAdmin(): Promise<boolean>;
  isAdmin(userId: string): Promise<boolean>;
  canUser(permission: string, tenantId?: string): Promise<boolean>;
  canUserFast(permission: string, tenantId?: string): Promise<boolean>;
  canUserAny(permissions: string[], tenantId?: string): Promise<boolean>;
  canUserAll(permissions: string[], tenantId?: string): Promise<boolean>;
  getUserEffectivePermissions(userId: string, tenantId?: string): Promise<any[]>;
  getUserRoleMetadataKeys(userId: string, tenantId?: string): Promise<string[]>;
  replaceUserRoles(userId: string, roleIds: string[], tenantId: string): Promise<void>;
  getRolesByUser(userId: string, tenantId?: string): Promise<string[]>;
  getUsersByRole(roleId: string): Promise<UserRole[]>;
  getUserAccessibleMenuItems(userId: string, tenantId?: string): Promise<any[]>;
  getUserAccessibleMetadataSurfaces(userId: string, tenantId?: string): Promise<any[]>;
}

@injectable()
export class UserRoleAdapter
  extends BaseAdapter<UserRole>
  implements IUserRoleAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'user_roles';

  protected defaultSelect = `
    id,
    user_id,
    role_id,
    created_by,
    updated_by,
    created_at,
    updated_at
  `;

  protected override async onAfterCreate(data: UserRole): Promise<void> {
    await this.auditService.logAuditEvent('create', 'user_role', data.id, data);
  }

  protected override async onAfterUpdate(data: UserRole): Promise<void> {
    await this.auditService.logAuditEvent('update', 'user_role', data.id, data);
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'user_role', id, { id });
  }

  public async getRoleDetailsByUser(
    userId: string,
    tenantId?: string
  ): Promise<{ role_id: string; role_name: string }[]> {
    // Validate userId
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid userId provided to getRoleDetailsByUser');
    }

    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc('get_user_roles', {
      user_id: userId,
      tenant_id: tenantId || null,
    });
    if (error) throw error;
    return (data || []) as { role_id: string; role_name: string }[];
  }

  public async getAdminRole(
    userId: string,
    tenantId: string
  ): Promise<string | null> {
    // Validate parameters
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid userId provided to getAdminRole');
    }
    if (!tenantId || typeof tenantId !== 'string') {
      throw new Error('Invalid tenantId provided to getAdminRole');
    }

    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase
      .from('tenant_users')
      .select('admin_role')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .single();
    if (error) throw error;
    return (data as any)?.admin_role || null;
  }

  public async getRolesWithPermissions(userId: string, tenantId?: string): Promise<any[]> {
    // Validate userId
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid userId provided to getRolesWithPermissions');
    }

    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc(
      'get_user_roles_with_permissions',
      {
        target_user_id: userId,
        target_tenant_id: tenantId || null
      }
    );
    if (error) throw error;
    return data || [];
  }

  /**
   * @deprecated Use checkSuperAdmin() from @/lib/rbac/permissionHelpers instead
   * This method now delegates to the centralized helper
   */
  public async isSuperAdmin(): Promise<boolean> {
    // Import dynamically to avoid circular dependency
    const { checkSuperAdmin } = await import('@/lib/rbac/permissionHelpers');
    return await checkSuperAdmin();
  }

  public async isAdmin(userId: string): Promise<boolean> {
    // Validate userId
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid userId provided to isAdmin');
    }

    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc('is_admin', {
      user_id: userId,
    });
    if (error) throw error;
    return Boolean(data);
  }

  public async canUser(permission: string, tenantId?: string): Promise<boolean> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc('can_user', {
      required_permission: permission,
      target_tenant_id: tenantId || null,
    });
    if (error) throw error;
    return Boolean(data);
  }

  public async canUserFast(permission: string, tenantId?: string): Promise<boolean> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc('can_user_fast', {
      required_permission: permission,
      target_tenant_id: tenantId || null,
    });
    if (error) throw error;
    return Boolean(data);
  }

  public async canUserAny(permissions: string[], tenantId?: string): Promise<boolean> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc('can_user_any', {
      required_permissions: permissions,
      target_tenant_id: tenantId || null,
    });
    if (error) throw error;
    return Boolean(data);
  }

  public async canUserAll(permissions: string[], tenantId?: string): Promise<boolean> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc('can_user_all', {
      required_permissions: permissions,
      target_tenant_id: tenantId || null,
    });
    if (error) throw error;
    return Boolean(data);
  }

  public async getUserEffectivePermissions(userId: string, tenantId?: string): Promise<any[]> {
    // Validate userId
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid userId provided to getUserEffectivePermissions');
    }

    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc('get_user_effective_permissions', {
      target_user_id: userId,
      target_tenant_id: tenantId || null,
    });
    if (error) throw error;
    return data || [];
  }

  public async getUserRoleMetadataKeys(userId: string, tenantId?: string): Promise<string[]> {
    // Validate userId
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid userId provided to getUserRoleMetadataKeys');
    }

    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc('get_user_role_metadata_keys', {
      target_user_id: userId,
      target_tenant_id: tenantId || null,
    });
    if (error) throw error;
    return data || [];
  }

  public async replaceUserRoles(
    userId: string,
    roleIds: string[],
    tenantId: string,
  ): Promise<void> {
    // Validate parameters
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid userId provided to replaceUserRoles');
    }
    if (!tenantId || typeof tenantId !== 'string') {
      throw new Error('Invalid tenantId provided to replaceUserRoles');
    }

    const supabase = await this.getSupabaseClient();
    const { error: deleteError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('tenant_id', tenantId);
    if (deleteError) throw deleteError;

    if (roleIds.length) {
      const currentUser = (await supabase.auth.getUser()).data.user?.id;
      const rows = roleIds.map((rid) => ({
        user_id: userId,
        role_id: rid,
        tenant_id: tenantId,
        created_by: currentUser,
        created_at: new Date().toISOString(),
      }));
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert(rows);
      if (insertError) throw insertError;
    }
  }

  public async getRolesByUser(userId: string, tenantId?: string): Promise<string[]> {
    // Validate userId
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid userId provided to getRolesByUser');
    }

    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc('get_user_roles', {
      user_id: userId,
      tenant_id: tenantId || null,
    });
    if (error) throw error;
    return (data || []).map((r: any) => r.role_name);
  }

  public async getUserAccessibleMenuItems(userId: string, tenantId?: string): Promise<any[]> {
    // Validate userId
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid userId provided to getUserAccessibleMenuItems');
    }

    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc('get_user_menu_with_metadata', {
      target_user_id: userId,
      target_tenant_id: tenantId || null,
    });
    if (error) throw error;
    return data || [];
  }

  public async getUserAccessibleMetadataSurfaces(userId: string, tenantId?: string): Promise<any[]> {
    // Validate userId
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid userId provided to getUserAccessibleMetadataSurfaces');
    }

    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc('get_user_accessible_metadata_surfaces', {
      target_user_id: userId,
      target_tenant_id: tenantId || null,
    });
    if (error) throw error;
    return data || [];
  }

  public async getUsersByRole(roleId: string): Promise<UserRole[]> {
    // Validate roleId
    if (!roleId || typeof roleId !== 'string') {
      throw new Error('Invalid roleId provided to getUsersByRole');
    }

    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('role_id', roleId);
    if (error) throw error;
    
    // Properly handle the data type conversion
    if (!data) return [];
    
    // Convert to unknown first, then to UserRole[] to satisfy TypeScript
    return (data as unknown) as UserRole[];
  }
}