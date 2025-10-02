import 'server-only';
import { injectable } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { Role } from '@/models/rbac.model';

export interface IRoleAdapter extends IBaseAdapter<Role> {
  getRoleWithPermissions(id: string): Promise<any | null>;
  getRolesByScope(scope: string): Promise<Role[]>;
  getRoleStatistics(includeSystem: boolean): Promise<Role[]>;
  getRole(id: string): Promise<Role | null>;
}

@injectable()
export class RoleAdapter extends BaseAdapter<Role> implements IRoleAdapter {
  protected tableName = 'roles';

  protected defaultSelect = `
    id,
    tenant_id,
    name,
    description,
    metadata_key,
    scope,
    is_system,
    is_delegatable,
    created_at,
    updated_at,
    deleted_at
  `;

  protected defaultRelationships = [
    {
      table: 'role_permissions',
      foreignKey: 'role_id',
      select: ['permission_id'],
      nestedRelationships: [
        {
          table: 'permissions',
          foreignKey: 'permission_id',
          select: ['id', 'name', 'action', 'module']
        }
      ]
    }
  ];

  private normalizeRoleScope(scope?: string | null): 'system' | 'tenant' | 'delegated' {
    if (scope === 'system' || scope === 'tenant' || scope === 'delegated') {
      return scope;
    }
    if (scope === 'campus' || scope === 'ministry') {
      return 'delegated';
    }
    return 'tenant';
  }

  async getRoleWithPermissions(id: string): Promise<any | null> {
    const supabase = await this.getSupabaseClient();
    const tenantId = await this.getTenantId();

    const { data, error } = await supabase
      .from('roles')
      .select(`
        *,
        role_permissions!inner (
          permissions (*)
        ),
        role_bundles!inner (
          permission_bundles (*)
        )
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch role: ${error.message}`);
    }

    if (!data) return null;

    const { count } = await supabase
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
      .eq('role_id', id)
      .eq('tenant_id', tenantId);

    return {
      ...data,
      permissions: data.role_permissions?.map((rp: any) => rp.permissions) || [],
      bundles: data.role_bundles?.map((rb: any) => rb.permission_bundles) || [],
      user_count: count || 0
    };
  }

  async getRolesByScope(scope: string): Promise<Role[]> {
    const { data } = await this.fetch({
      filters: {
        scope: { operator: 'eq', value: scope },
        deleted_at: { operator: 'isEmpty', value: true }
      },
      order: { column: 'name', ascending: true }
    });

    return data || [];
  }

  async getRoleStatistics(includeSystem: boolean): Promise<Role[]> {
    const supabase = await this.getSupabaseClient();
    const tenantId = await this.getTenantId();

    let query = supabase
      .from('roles')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);

    if (!includeSystem) {
      query = query.neq('scope', 'system');
    }

    const { data, error } = await query.order('name');

    if (error) {
      throw new Error(`Failed to fetch role statistics: ${error.message}`);
    }

    const roles = data || [];
    for (const role of roles) {
      const { count: userCount } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role_id', role.id)
        .eq('tenant_id', tenantId);

      const { count: bundleCount } = await supabase
        .from('role_bundles')
        .select('*', { count: 'exact', head: true })
        .eq('role_id', role.id)
        .eq('tenant_id', tenantId);

      (role as any).user_count = userCount || 0;
      (role as any).bundle_count = bundleCount || 0;
    }

    return roles;
  }

  async getRole(id: string): Promise<Role | null> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch role: ${error.message}`);
    }

    return data;
  }

  protected async onBeforeCreate(data: Partial<Role>): Promise<Partial<Role>> {
    if (data.scope) {
      data.scope = this.normalizeRoleScope(data.scope);
    }
    return data;
  }
}
