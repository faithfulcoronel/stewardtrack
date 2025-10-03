import 'server-only';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { TYPES } from '@/lib/types';
import type { AuditService } from '@/services/audit.service';
import type { Role, CreateRoleDto, UpdateRoleDto, RoleWithPermissions } from '@/models/rbac.model';

export interface IRoleAdapter extends IBaseAdapter<Role> {
  createRole(data: CreateRoleDto, tenantId: string): Promise<Role>;
  updateRole(id: string, data: UpdateRoleDto, tenantId: string): Promise<Role>;
  deleteRole(id: string, tenantId: string): Promise<void>;
  getRoles(tenantId: string, includeSystem?: boolean): Promise<Role[]>;
  getRole(roleId: string): Promise<Role | null>;
  getRoleWithPermissions(id: string, tenantId: string): Promise<RoleWithPermissions | null>;
  getRoleStatistics(tenantId: string, includeSystem?: boolean): Promise<Role[]>;
}

type RoleFlagFields = Pick<Role, "is_system" | "is_delegatable">;

@injectable()
export class RoleAdapter extends BaseAdapter<Role> implements IRoleAdapter {
  constructor(
    @inject(TYPES.AuditService) private auditService: AuditService
  ) {
    super();
  }

  protected tableName = 'roles';
  protected defaultSelect = `*`;

  private normalizeRoleScope(scope?: string | null): 'system' | 'tenant' | 'delegated' {
    if (scope === 'system' || scope === 'tenant' || scope === 'delegated') {
      return scope;
    }

    if (scope === 'campus' || scope === 'ministry') {
      return 'delegated';
    }

    return 'tenant';
  }

  private enrichRole<T extends Record<string, any>>(role: T | null, overrides: Partial<RoleFlagFields & { scope?: string }> = {}): (T & RoleFlagFields) | null {
    if (!role) {
      return null;
    }

    const normalizedScope = this.normalizeRoleScope(overrides.scope ?? role.scope);

    return {
      ...role,
      scope: normalizedScope,
      is_system: overrides.is_system ?? role.is_system ?? normalizedScope === 'system',
      is_delegatable: overrides.is_delegatable ?? role.is_delegatable ?? false
    };
  }

  private enrichRoleList<T extends Record<string, any>>(roles: (T | null)[] | null | undefined): (T & RoleFlagFields)[] {
    if (!roles?.length) {
      return [];
    }

    return roles
      .map(role => this.enrichRole(role))
      .filter((role): role is T & RoleFlagFields => Boolean(role));
  }

  async createRole(data: CreateRoleDto, tenantId: string): Promise<Role> {
    const supabase = await this.getSupabaseClient();
    const scope = this.normalizeRoleScope(data.scope);

    const { data: result, error } = await supabase
      .from(this.tableName)
      .insert({
        tenant_id: tenantId,
        name: data.name,
        description: data.description ?? null,
        metadata_key: data.metadata_key ?? null,
        scope
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to create role: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to create role: missing response payload');
    }

    const role = this.enrichRole(result);
    return role as Role;
  }

  async updateRole(id: string, data: UpdateRoleDto, tenantId: string): Promise<Role> {
    const supabase = await this.getSupabaseClient();
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (data.name !== undefined) {
      updatePayload.name = data.name;
    }
    if (data.description !== undefined) {
      updatePayload.description = data.description;
    }
    if (data.metadata_key !== undefined) {
      updatePayload.metadata_key = data.metadata_key;
    }
    if (data.scope !== undefined) {
      updatePayload.scope = this.normalizeRoleScope(data.scope);
    }
    if (data.is_delegatable !== undefined) {
      updatePayload.is_delegatable = data.is_delegatable;
    }

    const { data: result, error } = await supabase
      .from(this.tableName)
      .update(updatePayload)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to update role: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to update role: missing response payload');
    }

    const role = this.enrichRole(result);
    return role as Role;
  }

  async deleteRole(id: string, tenantId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to delete role: ${error.message}`);
    }
  }

  async getRoles(tenantId: string, includeSystem = true): Promise<Role[]> {
    const supabase = await this.getSupabaseClient();
    let query = supabase
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', tenantId);

    if (!includeSystem) {
      query = query.neq('scope', 'system');
    }

    const { data, error } = await query.order('name');

    if (error) {
      throw new Error(`Failed to fetch roles: ${error.message}`);
    }

    return this.enrichRoleList(data) as Role[];
  }

  async getRole(roleId: string): Promise<Role | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', roleId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch role: ${error.message}`);
    }

    return this.enrichRole(data) as Role | null;
  }

  async getRoleWithPermissions(id: string, tenantId: string): Promise<RoleWithPermissions | null> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase
      .from(this.tableName)
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

    const roleRecord = {
      ...data,
      permissions: data.role_permissions?.map((rp: any) => rp.permissions) || [],
      bundles: data.role_bundles?.map((rb: any) => rb.permission_bundles) || [],
      user_count: count || 0
    };

    return this.enrichRole(roleRecord) as RoleWithPermissions;
  }

  async getRoleStatistics(tenantId: string, includeSystem = true): Promise<Role[]> {
    const supabase = await this.getSupabaseClient();

    // Get roles
    let roleQuery = supabase
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);

    if (!includeSystem) {
      roleQuery = roleQuery.neq('scope', 'system');
    }

    const { data: rolesData, error: rolesError } = await roleQuery.order('name');

    if (rolesError) {
      throw new Error(`Failed to fetch role statistics: ${rolesError.message}`);
    }

    const roles = this.enrichRoleList(rolesData) as Role[];

    // Get user counts and bundle counts for each role
    for (const role of roles) {
      // Get user count for this role
      const { count: userCount } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role_id', role.id)
        .eq('tenant_id', tenantId);

      (role as any).user_count = userCount || 0;

      // Get bundle count for this role
      const { count: bundleCount } = await supabase
        .from('role_bundles')
        .select('*', { count: 'exact', head: true })
        .eq('role_id', role.id)
        .eq('tenant_id', tenantId);

      (role as any).bundle_count = bundleCount || 0;
    }

    return roles;
  }
}
