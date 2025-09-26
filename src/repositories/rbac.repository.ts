import { injectable } from 'inversify';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { BaseRepository } from './base.repository';
import {
  Role,
  PermissionBundle,
  Permission,
  UserRole,
  MetadataSurface,
  MetadataSurfaceOverlay,
  RbacSurfaceBinding,
  FeatureCatalog,
  TenantFeatureGrant,
  RoleWithPermissions,
  BundleWithPermissions,
  UserWithRoles,
  CreateRoleDto,
  UpdateRoleDto,
  CreatePermissionBundleDto,
  UpdatePermissionBundleDto,
  AssignRoleDto,
  CreateSurfaceBindingDto,
  RbacAuditLog,
  DelegatedContext
} from '@/models/rbac.model';

type RoleFlagFields = Pick<Role, "is_system" | "is_delegatable">;

@injectable()
export class RbacRepository extends BaseRepository {
  private supabaseClient: SupabaseClient | null = null;

  private async getSupabaseClient(): Promise<SupabaseClient> {
    if (!this.supabaseClient) {
      this.supabaseClient = await createSupabaseServerClient();
    }

    return this.supabaseClient;
  }

  private normalizeRoleScope(scope?: string | null): 'system' | 'tenant' | 'delegated' {
    if (scope === 'system' || scope === 'tenant' || scope === 'delegated') {
      return scope;
    }

    if (scope === 'campus' || scope === 'ministry') {
      return 'delegated';
    }

    return 'tenant';
  }

  private enrichRole<T extends Record<string, any>>(role: T | null, overrides: Partial<RoleFlagFields> = {}): (T & RoleFlagFields) | null {
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

  // Role management
  async createRole(data: CreateRoleDto, tenantId: string): Promise<Role> {
    const supabase = await this.getSupabaseClient();
    const scope = this.normalizeRoleScope(data.scope);

    const { data: result, error } = await supabase
      .from('roles')
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

    const { data: result, error } = await supabase
      .from('roles')
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
      .from('roles')
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
      .from('roles')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);

    if (!includeSystem) {
      query = query.neq('scope', 'system');
    }

    const { data, error } = await query.order('name');

    if (error) {
      throw new Error(`Failed to fetch roles: ${error.message}`);
    }

    return this.enrichRoleList(data) as Role[];
  }

  async getRoleWithPermissions(id: string, tenantId: string): Promise<RoleWithPermissions | null> {
    const supabase = await this.getSupabaseClient();
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

    const roleRecord = {
      ...data,
      permissions: data.role_permissions?.map((rp: any) => rp.permissions) || [],
      bundles: data.role_bundles?.map((rb: any) => rb.permission_bundles) || [],
      user_count: count || 0
    };

    return this.enrichRole(roleRecord) as RoleWithPermissions;
  }

  // Permission Bundle management
  async createPermissionBundle(data: CreatePermissionBundleDto, tenantId: string): Promise<PermissionBundle> {
    const supabase = await this.getSupabaseClient();
    const { permission_ids, ...bundleData } = data;

    const { data: result, error } = await supabase
      .from('permission_bundles')
      .insert({
        ...bundleData,
        tenant_id: tenantId,
        is_template: bundleData.is_template || false
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create permission bundle: ${error.message}`);
    }

    // Add permissions to bundle if provided
    if (permission_ids && permission_ids.length > 0) {
      await this.addPermissionsToBundle(result.id, permission_ids, tenantId);
    }

    return result;
  }

  async updatePermissionBundle(id: string, data: UpdatePermissionBundleDto, tenantId: string): Promise<PermissionBundle> {
    const supabase = await this.getSupabaseClient();
    const { data: result, error } = await supabase
      .from('permission_bundles')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update permission bundle: ${error.message}`);
    }

    return result;
  }

  async deletePermissionBundle(id: string, tenantId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    const { error } = await supabase
      .from('permission_bundles')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to delete permission bundle: ${error.message}`);
    }
  }

  async getPermissionBundles(tenantId: string, scopeFilter?: string): Promise<PermissionBundle[]> {
    const supabase = await this.getSupabaseClient();
    let query = supabase
      .from('permission_bundles')
      .select('*')
      .eq('tenant_id', tenantId);

    if (scopeFilter) {
      query = query.eq('scope', scopeFilter);
    }

    const { data, error } = await query.order('name');

    if (error) {
      throw new Error(`Failed to fetch permission bundles: ${error.message}`);
    }

    return data || [];
  }

  async getBundleWithPermissions(id: string, tenantId: string): Promise<BundleWithPermissions | null> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase
      .from('permission_bundles')
      .select(`
        *,
        bundle_permissions!inner (
          permissions (*)
        )
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch bundle: ${error.message}`);
    }

    if (!data) return null;

    // Get role count for this bundle
    const { count } = await supabase
      .from('role_bundles')
      .select('*', { count: 'exact', head: true })
      .eq('bundle_id', id)
      .eq('tenant_id', tenantId);

    return {
      ...data,
      permissions: data.bundle_permissions?.map((bp: any) => bp.permissions) || [],
      role_count: count || 0
    };
  }

  async addPermissionsToBundle(bundleId: string, permissionIds: string[], tenantId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    const bundlePermissions = permissionIds.map(permissionId => ({
      bundle_id: bundleId,
      permission_id: permissionId,
      tenant_id: tenantId
    }));

    const { error } = await supabase
      .from('bundle_permissions')
      .insert(bundlePermissions);

    if (error) {
      throw new Error(`Failed to add permissions to bundle: ${error.message}`);
    }
  }

  async removePermissionsFromBundle(bundleId: string, permissionIds: string[], tenantId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    const { error } = await supabase
      .from('bundle_permissions')
      .delete()
      .eq('bundle_id', bundleId)
      .eq('tenant_id', tenantId)
      .in('permission_id', permissionIds);

    if (error) {
      throw new Error(`Failed to remove permissions from bundle: ${error.message}`);
    }
  }

  // User Role assignment
  async assignRole(data: AssignRoleDto, tenantId: string, assignedBy?: string): Promise<UserRole> {
    const supabase = await this.getSupabaseClient();
    const { data: result, error } = await supabase
      .from('user_roles')
      .insert({
        ...data,
        tenant_id: tenantId,
        assigned_by: assignedBy,
        assigned_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to assign role: ${error.message}`);
    }

    return result;
  }

  async revokeRole(userId: string, roleId: string, tenantId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role_id', roleId)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to revoke role: ${error.message}`);
    }
  }

  async getUserRoles(userId: string, tenantId: string): Promise<Role[]> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        roles (*)
      `)
      .eq('user_id', userId)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to fetch user roles: ${error.message}`);
    }

    const roles = data?.map((ur: any) => ur.roles) || [];

    return this.enrichRoleList(roles) as Role[];
  }

  async getUserWithRoles(userId: string, tenantId: string): Promise<UserWithRoles | null> {
    const supabase = await this.getSupabaseClient();
    const { data: userData, error: userError } = await supabase
      .from('tenant_users')
      .select(`
        user:users (
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .single();

    if (userError || !userData) {
      return null;
    }

    const roles = await this.getUserRoles(userId, tenantId);
    const effectivePermissions = await this.getUserEffectivePermissions(userId, tenantId);

    return {
      ...userData.user,
      roles,
      effective_permissions: effectivePermissions
    };
  }

  async getUserEffectivePermissions(userId: string, tenantId: string): Promise<Permission[]> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase
      .rpc('get_user_effective_permissions', {
        p_user_id: userId,
        p_tenant_id: tenantId
      });

    if (error) {
      throw new Error(`Failed to fetch user permissions: ${error.message}`);
    }

    return data || [];
  }

  // Permission management
  async getPermissions(tenantId: string, module?: string): Promise<Permission[]> {
    const supabase = await this.getSupabaseClient();
    let query = supabase
      .from('permissions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (module) {
      query = query.eq('module', module);
    }

    const { data, error } = await query.order('module', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch permissions: ${error.message}`);
    }

    return data || [];
  }

  // Surface Binding management
  async createSurfaceBinding(data: CreateSurfaceBindingDto, tenantId: string): Promise<RbacSurfaceBinding> {
    const supabase = await this.getSupabaseClient();
    const { data: result, error } = await supabase
      .from('rbac_surface_bindings')
      .insert({
        ...data,
        tenant_id: tenantId,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create surface binding: ${error.message}`);
    }

    return result;
  }

  async updateSurfaceBinding(id: string, data: Partial<CreateSurfaceBindingDto>, tenantId: string): Promise<RbacSurfaceBinding> {
    const supabase = await this.getSupabaseClient();
    const { data: result, error } = await supabase
      .from('rbac_surface_bindings')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update surface binding: ${error.message}`);
    }

    return result;
  }

  async deleteSurfaceBinding(id: string, tenantId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    const { error } = await supabase
      .from('rbac_surface_bindings')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to delete surface binding: ${error.message}`);
    }
  }

  async getSurfaceBindings(tenantId: string): Promise<RbacSurfaceBinding[]> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase
      .from('rbac_surface_bindings')
      .select(`
        *,
        role:roles (id, name),
        bundle:permission_bundles (id, name)
      `)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch surface bindings: ${error.message}`);
    }

    return data || [];
  }

  // Metadata Surface management
  async getMetadataSurfaces(): Promise<MetadataSurface[]> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase
      .from('metadata_surfaces')
      .select('*')
      .eq('is_system', true)
      .order('module', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch metadata surfaces: ${error.message}`);
    }

    return data || [];
  }

  async getMetadataSurfaceOverlays(surfaceId: string): Promise<MetadataSurfaceOverlay[]> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase
      .from('metadata_surface_overlays')
      .select('*')
      .eq('surface_id', surfaceId)
      .order('persona');

    if (error) {
      throw new Error(`Failed to fetch surface overlays: ${error.message}`);
    }

    return data || [];
  }

  // Feature management
  async getFeatureCatalog(): Promise<FeatureCatalog[]> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase
      .from('feature_catalog')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch feature catalog: ${error.message}`);
    }

    return data || [];
  }

  async getTenantFeatureGrants(tenantId: string): Promise<TenantFeatureGrant[]> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase
      .from('tenant_feature_grants')
      .select(`
        *,
        feature:feature_catalog (*)
      `)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to fetch tenant feature grants: ${error.message}`);
    }

    return data || [];
  }

  // Audit logging
  async createAuditLog(log: Omit<RbacAuditLog, 'id' | 'created_at'>): Promise<void> {
    const supabase = await this.getSupabaseClient();
    const { error } = await supabase
      .from('rbac_audit_logs')
      .insert({
        ...log,
        created_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Failed to create audit log: ${error.message}`);
    }
  }

  async getAuditLogs(tenantId: string, limit = 100, offset = 0): Promise<RbacAuditLog[]> {
    const supabase = await this.getSupabaseClient();
    const safeLimit = Math.max(limit ?? 100, 1);
    const safeOffset = Math.max(offset ?? 0, 0);

    let query = supabase
      .from('rbac_audit_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (safeOffset > 0) {
      query = query.range(safeOffset, safeOffset + safeLimit - 1);
    } else {
      query = query.limit(safeLimit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch audit logs: ${error.message}`);
    }

    return data || [];
  }

  // Delegated access context
  async getDelegatedContext(userId: string, tenantId: string): Promise<DelegatedContext | null> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase
      .rpc('get_delegated_context', {
        p_user_id: userId,
        p_tenant_id: tenantId
      });

    if (error) {
      throw new Error(`Failed to fetch delegated context: ${error.message}`);
    }

    return data;
  }

  async getUsersInDelegatedScope(delegatedContext: DelegatedContext): Promise<UserWithRoles[]> {
    const supabase = await this.getSupabaseClient();
    // Implementation depends on the specific delegation scope
    // This would filter users based on campus/ministry assignments
    const { data, error } = await supabase
      .rpc('get_users_in_delegated_scope', {
        p_context: delegatedContext
      });

    if (error) {
      throw new Error(`Failed to fetch users in delegated scope: ${error.message}`);
    }

    return data || [];
  }

  // Multi-role support
  async getUserMultiRoleContext(userId: string, tenantId: string): Promise<any> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase
      .rpc('get_user_multi_role_context', {
        p_user_id: userId,
        p_tenant_id: tenantId
      });

    if (error) {
      throw new Error(`Failed to fetch multi-role context: ${error.message}`);
    }

    return data;
  }
}
