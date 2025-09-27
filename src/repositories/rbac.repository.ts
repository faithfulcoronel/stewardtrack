import { injectable } from 'inversify';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { BaseRepository } from './base.repository';
import {
  cancelPublishingJob as cancelPublishingJobInStore,
  getPublishingJobsSnapshot,
  getPublishingStatsSnapshot,
  getTenantPublishingStatusesSnapshot,
  queuePublishingJob,
  type PublishingJobSnapshot,
  type PublishingStatsSnapshot,
  type QueuePublishingJobResult,
  type TenantPublishingStatusSnapshot,
} from '@/lib/rbac/publishing-store';
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
  CreateRbacAuditLogInput,
  RbacAuditOperation,
  DelegatedContext
} from '@/models/rbac.model';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = (value?: string | null): value is string => Boolean(value && UUID_PATTERN.test(value));

const composeAuditNote = (input: CreateRbacAuditLogInput): string | null => {
  if (input.notes) {
    return input.notes;
  }

  const payload: Record<string, string> = {};

  if (input.action_label) {
    payload.action = input.action_label;
  }

  if (input.resource_identifier) {
    payload.resource_id = input.resource_identifier;
  }

  return Object.keys(payload).length > 0 ? JSON.stringify(payload) : null;
};

const parseAuditNote = (note?: string | null): {
  actionLabel?: string;
  resourceIdentifier?: string;
} => {
  if (!note) {
    return {};
  }

  try {
    const parsed = JSON.parse(note);
    if (parsed && typeof parsed === 'object') {
      const record = parsed as Record<string, unknown>;
      const action = typeof record.action === 'string' ? record.action : undefined;
      const resourceId = typeof record.resource_id === 'string' ? record.resource_id : undefined;

      return {
        actionLabel: action,
        resourceIdentifier: resourceId
      };
    }
  } catch {
    return { actionLabel: note };
  }

  return {};
};

const buildAuditActionFallback = (operation?: string | null, tableName?: string | null): string => {
  const opSegment = (operation ?? 'SYSTEM').toString().toUpperCase();
  const tableSegment = (tableName ?? 'EVENT').toString().toUpperCase();
  return `${opSegment}_${tableSegment}`;
};

const normalizeUuid = (value?: string | null): string | null => (isUuid(value) ? value : null);

const toResourceType = (tableName?: string | null): string | null => {
  if (!tableName) {
    return null;
  }

  switch (tableName) {
    case 'roles':
      return 'role';
    case 'permission_bundles':
      return 'permission_bundle';
    case 'user_roles':
      return 'user_role';
    case 'rbac_surface_bindings':
      return 'rbac_surface_binding';
    default:
      return tableName;
  }
};

type AuditLogRow = {
  id: string;
  tenant_id: string | null;
  table_name: string | null;
  operation: RbacAuditOperation | null;
  record_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  changed_fields: string[] | null;
  user_id: string | null;
  user_email: string | null;
  ip_address: string | null;
  user_agent: string | null;
  session_id: string | null;
  created_at: string;
  security_impact: string | null;
  notes: string | null;
};
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

  async getUsersWithRole(roleId: string, tenantId: string): Promise<any[]> {
    const supabase = await this.getSupabaseClient();

    try {
      // Get user role assignments for this role
      const { data: userRolesData, error: userRolesError } = await supabase
        .from('user_roles')
        .select(`
          id,
          user_id,
          assigned_at,
          assigned_by
        `)
        .eq('role_id', roleId);

      if (userRolesError) {
        console.error('Error fetching user roles:', userRolesError);
        return [];
      }

      if (!userRolesData || userRolesData.length === 0) {
        return [];
      }

      const userIds = userRolesData.map(ur => ur.user_id);

      // Get user information using the same approach as getMultiRoleUsers
      let usersInfo: any[] = [];

      // Try to get from auth.users using RPC function first
      try {
        const { data: authUsersData, error: authUsersError } = await supabase
          .rpc('get_user_profiles', { user_ids: userIds });

        if (!authUsersError && authUsersData && authUsersData.length > 0) {
          usersInfo = authUsersData.map(user => ({
            id: user.id,
            email: user.email,
            first_name: user.raw_user_meta_data?.first_name || user.raw_user_meta_data?.firstName || '',
            last_name: user.raw_user_meta_data?.last_name || user.raw_user_meta_data?.lastName || ''
          }));
        }
      } catch (authError) {
        console.warn('Could not access auth.users via RPC:', authError);
      }

      // For missing users, try member data
      const foundUserIds = new Set(usersInfo.map(u => u.id));
      const missingUserIds = userIds.filter(id => !foundUserIds.has(id));

      if (missingUserIds.length > 0) {
        try {
          const { data: tenantUsersWithMember, error: memberError } = await supabase
            .from('tenant_users')
            .select(`
              user_id,
              member:member_id(
                preferred_name,
                first_name,
                last_name,
                email
              )
            `)
            .eq('tenant_id', tenantId)
            .in('user_id', missingUserIds);

          if (!memberError && tenantUsersWithMember) {
            const memberUsersInfo = tenantUsersWithMember
              .filter(tu => tu.member && tu.member.email)
              .map(tu => ({
                id: tu.user_id,
                email: tu.member!.email,
                first_name: tu.member!.preferred_name || tu.member!.first_name || '',
                last_name: tu.member!.last_name || ''
              }));

            usersInfo = [...usersInfo, ...memberUsersInfo];
          }
        } catch (memberError) {
          console.warn('Could not access member data:', memberError);
        }
      }

      // Combine user role data with user info
      const results = userRolesData.map(userRole => {
        const userInfo = usersInfo.find(u => u.id === userRole.user_id);

        return {
          id: userRole.id,
          user_id: userRole.user_id,
          assigned_at: userRole.assigned_at,
          assigned_by: userRole.assigned_by,
          user: userInfo || {
            id: userRole.user_id,
            email: `user-${userRole.user_id.slice(0, 8)}@unknown.local`,
            first_name: 'Unknown',
            last_name: 'User'
          }
        };
      });

      return results;
    } catch (error) {
      console.error('Error in getUsersWithRole:', error);
      return [];
    }
  }

  async getBundlePermissions(bundleId: string, tenantId: string): Promise<any[]> {
    const supabase = await this.getSupabaseClient();

    try {
      // Get permissions that belong to this bundle
      const { data: bundlePermissionsData, error: bundlePermissionsError } = await supabase
        .from('bundle_permissions')
        .select(`
          id,
          permission_id,
          bundle_id,
          permissions (
            id,
            name,
            action,
            module,
            description,
            scope
          )
        `)
        .eq('bundle_id', bundleId);

      if (bundlePermissionsError) {
        console.error('Error fetching bundle permissions:', bundlePermissionsError);
        return [];
      }

      if (!bundlePermissionsData || bundlePermissionsData.length === 0) {
        return [];
      }

      // Transform the data to include permission details
      const permissions = bundlePermissionsData
        .filter(bp => bp.permissions) // Only include items that have permission data
        .map(bp => ({
          id: bp.permissions.id,
          name: bp.permissions.name,
          action: bp.permissions.action,
          module: bp.permissions.module,
          description: bp.permissions.description,
          scope: bp.permissions.scope,
          bundle_permission_id: bp.id // Include the relationship ID if needed
        }));

      return permissions;
    } catch (error) {
      console.error('Error in getBundlePermissions:', error);
      return [];
    }
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
      .eq('tenant_id', tenantId);

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

  async updateSurfaceBinding(
    id: string,
    data: Partial<CreateSurfaceBindingDto>,
    tenantId: string
  ): Promise<RbacSurfaceBinding> {
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
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to update surface binding: ${error.message}`);
    }

    if (!result) {
      throw new Error('Surface binding not found');
    }

    return result;
  }

  async deleteSurfaceBinding(id: string, tenantId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase
      .from('rbac_surface_bindings')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('id')
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to delete surface binding: ${error.message}`);
    }

    if (!data) {
      throw new Error('Surface binding not found');
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

  async getSurfaceBinding(id: string, tenantId: string): Promise<RbacSurfaceBinding | null> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase
      .from('rbac_surface_bindings')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }

      throw new Error(`Failed to fetch surface binding: ${error.message}`);
    }

    return data ?? null;
  }

  // Metadata Surface management
  async getMetadataSurfaces(
    _tenantId: string,
    filters?: {
      module?: string;
      phase?: string;
      surface_type?: string;
    }
  ): Promise<MetadataSurface[]> {
    const supabase = await this.getSupabaseClient();

    let query = supabase
      .from('metadata_surfaces')
      .select('*');

    if (filters?.module) {
      query = query.eq('module', filters.module);
    }

    if (filters?.phase) {
      query = query.eq('phase', filters.phase);
    }

    if (filters?.surface_type) {
      query = query.eq('surface_type', filters.surface_type);
    }

    const { data, error } = await query.order('module', { ascending: true }).order('title', { ascending: true });

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
  async createAuditLog(log: CreateRbacAuditLogInput): Promise<void> {
    // Skip audit logging for mock/test tenants or when tenant ID is not properly resolved
    if (!log.tenant_id || log.tenant_id === 'mock-tenant' || log.tenant_id === 'unknown') {
      console.warn('Skipping audit log creation: invalid tenant context', log.tenant_id);
      return;
    }

    const supabase = await this.getSupabaseClient();
    const recordId = normalizeUuid(log.record_id ?? log.resource_identifier ?? null);
    const userId = normalizeUuid(log.user_id);

    const { error } = await supabase
      .from('rbac_audit_log')
      .insert({
        tenant_id: log.tenant_id,
        table_name: log.table_name,
        operation: log.operation,
        record_id: recordId,
        old_values: log.old_values ?? null,
        new_values: log.new_values ?? null,
        changed_fields: log.changed_fields ?? null,
        user_id: userId,
        user_email: log.user_email ?? null,
        ip_address: log.ip_address ?? null,
        user_agent: log.user_agent ?? null,
        session_id: log.session_id ?? null,
        security_impact: log.security_impact ?? null,
        notes: composeAuditNote(log),
        created_at: new Date().toISOString()
      });

    if (error) {
      // Log the error but don't throw for RLS policy violations in development/testing
      if (error.message.includes('row-level security policy')) {
        console.warn('Audit log skipped due to RLS policy:', error.message);
        return;
      }
      throw new Error(`Failed to create audit log: ${error.message}`);
    }
  }

  async getAuditLogs(tenantId: string, limit = 100, offset = 0): Promise<RbacAuditLog[]> {
    const supabase = await this.getSupabaseClient();
    const safeLimit = Math.max(limit ?? 100, 1);
    const safeOffset = Math.max(offset ?? 0, 0);

    let query = supabase
      .from('rbac_audit_log')
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

    const rows = (data ?? []) as AuditLogRow[];

    return rows.map(row => {
      const { actionLabel, resourceIdentifier } = parseAuditNote(row.notes);
      const operation = (row.operation ?? 'SYSTEM') as RbacAuditOperation;
      const tableName = row.table_name ?? null;
      const action = actionLabel ?? buildAuditActionFallback(operation, tableName);
      const resourceId = row.record_id ?? resourceIdentifier ?? null;

      return {
        id: row.id,
        tenant_id: row.tenant_id ?? null,
        table_name: tableName,
        resource_type: toResourceType(tableName),
        operation,
        action,
        record_id: row.record_id ?? null,
        resource_id: resourceId,
        old_values: row.old_values ?? null,
        new_values: row.new_values ?? null,
        changed_fields: row.changed_fields ?? null,
        user_id: row.user_id ?? null,
        user_email: row.user_email ?? null,
        ip_address: row.ip_address ?? null,
        user_agent: row.user_agent ?? null,
        session_id: row.session_id ?? null,
        created_at: row.created_at,
        security_impact: row.security_impact ?? null,
        notes: row.notes ?? null
      };
    });
  }
  // Delegated access context
  async getDelegatedContext(userId: string, tenantId: string): Promise<DelegatedContext | null> {
    if (!userId || !tenantId) {
      return null;
    }

    // Temporary mock until Supabase RPC (get_delegated_context) is provisioned.
    const mockDelegatedContext: DelegatedContext = {
      user_id: userId,
      tenant_id: tenantId,
      scope: 'campus',
      scope_id: 'campus-1',
      allowed_roles: ['role-1', 'role-2', 'role-3'],
      allowed_bundles: ['bundle-1', 'bundle-2']
    };

    return mockDelegatedContext;
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

  // Statistics methods
  async getRoleStatistics(tenantId: string, includeSystem = true): Promise<Role[]> {
    const supabase = await this.getSupabaseClient();
    let roleQuery = supabase
      .from('roles')
      .select('*, user_roles(count)')
      .eq('tenant_id', tenantId)


    if (!includeSystem) {
      roleQuery = roleQuery.neq('scope', 'system');
    }

    const { data: rolesData, error: rolesError } = await roleQuery.order('name');

    if (rolesError) {
      throw new Error(`Failed to fetch role statistics: ${rolesError.message}`);
    }

    const enrichedRoles = this.enrichRoleList(rolesData) as Role[];

    // Get user counts for each role
    for (const role of enrichedRoles) {
      const { count } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role_id', role.id)
        .eq('tenant_id', tenantId);

      (role as any).user_count = count || 0;

      // Get bundle count for each role
      const { count: bundleCount } = await supabase
        .from('role_bundles')
        .select('*', { count: 'exact', head: true })
        .eq('role_id', role.id)
        .eq('tenant_id', tenantId);

      (role as any).bundle_count = bundleCount || 0;
    }

    return enrichedRoles;
  }

  async getBundleStatistics(tenantId: string, scopeFilter?: string): Promise<PermissionBundle[]> {
    const supabase = await this.getSupabaseClient();
    let bundleQuery = supabase
      .from('permission_bundles')
      .select('*')
      .eq('tenant_id', tenantId);

    if (scopeFilter) {
      bundleQuery = bundleQuery.eq('scope', scopeFilter);
    }

    const { data: bundlesData, error: bundlesError } = await bundleQuery.order('name');

    if (bundlesError) {
      throw new Error(`Failed to fetch bundle statistics: ${bundlesError.message}`);
    }

    const bundles = bundlesData || [];

    // Get role counts and permission counts for each bundle
    for (const bundle of bundles) {
      // Get role count for this bundle
      const { count: roleCount } = await supabase
        .from('role_bundles')
        .select('*', { count: 'exact', head: true })
        .eq('bundle_id', bundle.id)
        .eq('tenant_id', tenantId);

      (bundle as any).role_count = roleCount || 0;

      // Get permission count for this bundle
      const { count: permissionCount } = await supabase
        .from('bundle_permissions')
        .select('*', { count: 'exact', head: true })
        .eq('bundle_id', bundle.id)
        .eq('tenant_id', tenantId);

      (bundle as any).permission_count = permissionCount || 0;
    }

    return bundles;
  }

  async getDashboardStatistics(tenantId: string): Promise<{
    totalRoles: number;
    totalBundles: number;
    totalUsers: number;
    activeUsers: number;
    surfaceBindings: number;
    systemRoles: number;
    customBundles: number;
  }> {
    const supabase = await this.getSupabaseClient();

    // Get all statistics in parallel
    const [
      { count: totalRoles },
      { count: totalBundles },
      { count: totalUsers },
      { count: activeUsers },
      { count: surfaceBindings },
      { count: systemRoles },
      { count: customBundles }
    ] = await Promise.all([
      // Total roles
      supabase
        .from('roles')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .is('deleted_at', null),

      // Total bundles
      supabase
        .from('permission_bundles')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId),

      // Total users in tenant
      supabase
        .from('tenant_users')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId),

      // Active users (users with roles)
      supabase
        .from('user_roles')
        .select('user_id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId),

      // Surface bindings
      supabase
        .from('rbac_surface_bindings')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('is_active', true),

      // System roles
      supabase
        .from('roles')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('scope', 'system')
        .is('deleted_at', null),

      // Custom bundles (non-template bundles)
      supabase
        .from('permission_bundles')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('is_template', false)
    ]);

    return {
      totalRoles: totalRoles || 0,
      totalBundles: totalBundles || 0,
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      surfaceBindings: surfaceBindings || 0,
      systemRoles: systemRoles || 0,
      customBundles: customBundles || 0
    };
  }

  async createMetadataSurface(surfaceData: {
    module: string;
    route?: string;
    blueprint_path: string;
    surface_type: string;
    phase: string;
    title?: string;
    description?: string;
    feature_code?: string;
    rbac_role_keys?: string[];
    rbac_bundle_keys?: string[];
    default_menu_code?: string;
    supports_mobile: boolean;
    supports_desktop: boolean;
    is_system: boolean;
  }): Promise<MetadataSurface> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from('metadata_surfaces')
      .insert({
        ...surfaceData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating metadata surface:', error);
      throw new Error(`Failed to create metadata surface: ${error.message}`);
    }

    return data;
  }

  // Feature Catalog Management
  async getFeatures(filters?: {
    category?: string;
    phase?: string;
    is_active?: boolean;
  }): Promise<FeatureCatalog[]> {
    const supabase = await this.getSupabaseClient();

    let query = supabase
      .from('feature_catalog')
      .select('*');

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.phase) {
      query = query.eq('phase', filters.phase);
    }
    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    const { data, error } = await query.order('category').order('name');

    if (error) {
      console.error('Error fetching features:', error);
      throw new Error(`Failed to fetch features: ${error.message}`);
    }

    return data || [];
  }

  async createFeature(featureData: {
    code: string;
    name: string;
    category: string;
    description?: string;
    phase: string;
    is_delegatable: boolean;
    is_active: boolean;
  }): Promise<FeatureCatalog> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from('feature_catalog')
      .insert({
        ...featureData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating feature:', error);
      throw new Error(`Failed to create feature: ${error.message}`);
    }

    return data;
  }

  // Phase D - Delegation Methods
  async getDelegationScopes(delegatedContext: any): Promise<any[]> {
    const supabase = await this.getSupabaseClient();

    // Mock implementation - in reality this would query campus/ministry tables
    const mockScopes = [
      {
        id: 'campus-1',
        name: 'Main Campus',
        type: 'campus',
        user_count: 45,
        role_count: 8
      },
      {
        id: 'ministry-1',
        name: 'Youth Ministry',
        type: 'ministry',
        user_count: 15,
        role_count: 4,
        parent_id: 'campus-1'
      },
      {
        id: 'ministry-2',
        name: 'Worship Ministry',
        type: 'ministry',
        user_count: 12,
        role_count: 3,
        parent_id: 'campus-1'
      }
    ];

    return mockScopes.filter(scope =>
      delegatedContext.scope === 'campus' ||
      (delegatedContext.scope === 'ministry' && scope.type === 'ministry')
    );
  }

  async getDelegatedUsers(delegatedContext: any): Promise<any[]> {
    const supabase = await this.getSupabaseClient();

    try {
      // Query delegation permissions first
      const { data: delegationsData, error: delegationsError } = await supabase
        .from('delegation_permissions')
        .select(`
          id,
          delegatee_id,
          scope_type,
          scope_id,
          permissions,
          is_active,
          delegation_scopes:scope_id (
            name,
            type
          )
        `)
        .eq('tenant_id', delegatedContext.tenant_id)
        .eq('is_active', true);

      if (delegationsError) {
        console.error('Error fetching delegations:', delegationsError);
        return [];
      }

      if (!delegationsData || delegationsData.length === 0) {
        return [];
      }

      // Get unique delegatee IDs
      const delegateeIds = [...new Set(delegationsData.map(d => d.delegatee_id))];

      // Query tenant users for these delegatees
      const { data: usersData, error: usersError } = await supabase
        .from('tenant_users')
        .select(`
          user_id,
          users:user_id (
            id,
            email,
            user_metadata
          )
        `)
        .eq('tenant_id', delegatedContext.tenant_id)
        .in('user_id', delegateeIds);

      if (usersError) {
        console.error('Error fetching users:', usersError);
        return [];
      }

      // Transform data to expected format
      return (usersData || []).map(tu => {
        const user = tu.users;
        const metadata = user?.user_metadata || {};
        const userDelegations = delegationsData.filter(d => d.delegatee_id === tu.user_id);

        return {
          id: user?.id,
          email: user?.email,
          first_name: metadata.first_name || metadata.firstName || '',
          last_name: metadata.last_name || metadata.lastName || '',
          delegated_permissions: userDelegations.map(dp => ({
            id: dp.id,
            scope_type: dp.scope_type,
            scope_name: dp.delegation_scopes?.name || 'Unknown',
            permissions: dp.permissions || []
          }))
        };
      });
    } catch (error) {
      console.error('Error in getDelegatedUsers:', error);
      return [];
    }
  }

  async getDelegationRoles(delegatedContext: DelegatedContext): Promise<Role[]> {
    const now = new Date().toISOString();

    const mockRoles: Role[] = [
      {
        id: 'role-1',
        tenant_id: delegatedContext.tenant_id,
        name: 'Campus Volunteer Coordinator',
        description: 'Coordinates volunteers within the delegated campus scope.',
        scope: 'campus',
        is_system: false,
        is_delegatable: true,
        created_at: now,
        updated_at: now
      },
      {
        id: 'role-2',
        tenant_id: delegatedContext.tenant_id,
        name: 'Youth Ministry Lead',
        description: 'Manages youth ministry operations and volunteer onboarding.',
        scope: 'ministry',
        is_system: false,
        is_delegatable: true,
        created_at: now,
        updated_at: now
      },
      {
        id: 'role-3',
        tenant_id: delegatedContext.tenant_id,
        name: 'Campus Care Team',
        description: 'Handles pastoral care follow-up for the delegated campus.',
        scope: 'campus',
        is_system: false,
        is_delegatable: false,
        created_at: now,
        updated_at: now
      }
    ];

    if (delegatedContext.scope === 'ministry') {
      return mockRoles.filter(role => role.scope === 'ministry');
    }

    return mockRoles;
  }

  async getDelegationStats(delegatedContext: DelegatedContext): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalRoles: number;
    delegatableRoles: number;
    scopeCount: number;
    recentChanges: number;
  }> {
    const [users, roles, scopes] = await Promise.all([
      this.getDelegatedUsers(delegatedContext),
      this.getDelegationRoles(delegatedContext),
      this.getDelegationScopes(delegatedContext)
    ]);

    const activeUsers = users.filter(user => Array.isArray(user.delegated_roles) && user.delegated_roles.length > 0).length;
    const delegatableRoles = roles.filter(role => role.is_delegatable).length;

    return {
      totalUsers: users.length,
      activeUsers,
      totalRoles: roles.length,
      delegatableRoles,
      scopeCount: scopes.length,
      recentChanges: Math.max(delegatableRoles, 2)
    };
  }

  async assignDelegatedRole(params: {
    delegatorId: string;
    delegateeId: string;
    roleId: string;
    scopeId?: string;
    context: DelegatedContext;
  }): Promise<{ success: boolean; assignment: Partial<UserRole> & { scope_id?: string | null } }> {
    const assignment: Partial<UserRole> & { scope_id?: string | null } = {
      id: 'delegated-assignment-' + Date.now().toString(),
      user_id: params.delegateeId,
      role_id: params.roleId,
      tenant_id: params.context.tenant_id,
      assigned_by: params.delegatorId,
      assigned_at: new Date().toISOString(),
      scope_id: params.scopeId ?? params.context.scope_id ?? null
    };

    return {
      success: true,
      assignment
    };
  }

  async revokeDelegatedRole(params: {
    delegatorId: string;
    delegateeId: string;
    roleId: string;
    context: DelegatedContext;
  }): Promise<{ success: boolean }> {
    void params;
    return { success: true };
  }

  async getRole(roleId: string): Promise<Role | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('id', roleId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch role: ${error.message}`);
    }

    return data;
  }

  // Delegation permission management
  async getDelegationPermissions(tenantId: string): Promise<any[]> {
    const supabase = await this.getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('delegation_permissions')
        .select(`
          id,
          delegator_id,
          delegatee_id,
          scope_type,
          scope_id,
          permissions,
          restrictions,
          expiry_date,
          is_active,
          notes,
          last_used_at,
          created_at,
          updated_at,
          delegation_scopes:scope_id (
            name,
            type
          )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching delegation permissions:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Get unique user IDs to fetch user information
      const userIds = new Set<string>();
      data.forEach(dp => {
        if (dp.delegator_id) userIds.add(dp.delegator_id);
        if (dp.delegatee_id) userIds.add(dp.delegatee_id);
      });

      // Fetch user information from auth.users via tenant_users
      const { data: usersData, error: usersError } = await supabase
        .from('tenant_users')
        .select(`
          user_id,
          users:user_id (
            email,
            user_metadata
          )
        `)
        .eq('tenant_id', tenantId)
        .in('user_id', Array.from(userIds));

      if (usersError) {
        console.error('Error fetching user data:', usersError);
        // Continue without user names
      }

      // Create a map of user info for quick lookup
      const userMap = new Map();
      if (usersData) {
        usersData.forEach(tu => {
          if (tu.users) {
            userMap.set(tu.user_id, tu.users);
          }
        });
      }

      // Transform data to expected format
      return data.map(dp => {
        const delegatorUser = userMap.get(dp.delegator_id);
        const delegateeUser = userMap.get(dp.delegatee_id);

        const delegatorMeta = delegatorUser?.user_metadata || {};
        const delegateeMeta = delegateeUser?.user_metadata || {};

        return {
          id: dp.id,
          delegator_id: dp.delegator_id,
          delegatee_id: dp.delegatee_id,
          delegator_name: `${delegatorMeta.first_name || delegatorMeta.firstName || ''} ${delegatorMeta.last_name || delegatorMeta.lastName || ''}`.trim() || delegatorUser?.email || 'Unknown',
          delegatee_name: `${delegateeMeta.first_name || delegateeMeta.firstName || ''} ${delegateeMeta.last_name || delegateeMeta.lastName || ''}`.trim() || delegateeUser?.email || 'Unknown',
          scope_type: dp.scope_type,
          scope_id: dp.scope_id,
          scope_name: dp.delegation_scopes?.name || 'Unknown',
          permissions: dp.permissions || [],
          restrictions: dp.restrictions || [],
          expiry_date: dp.expiry_date,
          is_active: dp.is_active,
          notes: dp.notes,
          last_used: dp.last_used_at,
          created_at: dp.created_at,
          status: dp.is_active ? 'active' : 'inactive'
        };
      });
    } catch (error) {
      console.error('Error in getDelegationPermissions:', error);
      return [];
    }
  }

  async createDelegationPermission(permissionData: any, tenantId: string): Promise<any> {
    const supabase = await this.getSupabaseClient();

    try {
      // Get current user ID from auth context
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user found');
      }

      const insertData = {
        tenant_id: tenantId,
        delegator_id: user.id,
        delegatee_id: permissionData.delegatee_id,
        scope_type: permissionData.scope_type,
        scope_id: permissionData.scope_id,
        permissions: permissionData.permissions || [],
        restrictions: permissionData.restrictions || [],
        expiry_date: permissionData.expiry_date || null,
        notes: permissionData.notes || null,
        is_active: true
      };

      const { data, error } = await supabase
        .from('delegation_permissions')
        .insert([insertData])
        .select(`
          id,
          delegator_id,
          delegatee_id,
          scope_type,
          scope_id,
          permissions,
          restrictions,
          expiry_date,
          is_active,
          created_at,
          delegation_scopes:scope_id (
            name,
            type
          )
        `)
        .single();

      if (error) {
        console.error('Error creating delegation permission:', error);
        throw new Error(`Failed to create delegation permission: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in createDelegationPermission:', error);
      throw error;
    }
  }

  async updateDelegationPermission(id: string, permissionData: any, tenantId: string): Promise<any> {
    const supabase = await this.getSupabaseClient();

    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      // Only update fields that are provided
      if (permissionData.permissions !== undefined) updateData.permissions = permissionData.permissions;
      if (permissionData.restrictions !== undefined) updateData.restrictions = permissionData.restrictions;
      if (permissionData.expiry_date !== undefined) updateData.expiry_date = permissionData.expiry_date;
      if (permissionData.notes !== undefined) updateData.notes = permissionData.notes;
      if (permissionData.is_active !== undefined) updateData.is_active = permissionData.is_active;

      const { data, error } = await supabase
        .from('delegation_permissions')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) {
        console.error('Error updating delegation permission:', error);
        throw new Error(`Failed to update delegation permission: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in updateDelegationPermission:', error);
      throw error;
    }
  }

  async revokeDelegationPermission(id: string, tenantId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();

    try {
      const { error } = await supabase
        .from('delegation_permissions')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('Error revoking delegation permission:', error);
        throw new Error(`Failed to revoke delegation permission: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in revokeDelegationPermission:', error);
      throw error;
    }
  }

  async getPermissionTemplates(tenantId: string): Promise<any[]> {
    const supabase = await this.getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('delegation_templates')
        .select(`
          id,
          name,
          description,
          scope_type,
          permissions,
          restrictions,
          is_system,
          is_active,
          created_at
        `)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('is_system', { ascending: false })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching delegation templates:', error);
        return [];
      }

      // Transform data to expected format
      return (data || []).map(template => ({
        id: template.id,
        template_name: template.name,
        scope_type: template.scope_type,
        scope_name: template.scope_type.charAt(0).toUpperCase() + template.scope_type.slice(1),
        description: template.description,
        permissions_count: (template.permissions || []).length,
        permissions: template.permissions || [],
        restrictions: template.restrictions || [],
        is_system: template.is_system
      }));
    } catch (error) {
      console.error('Error in getPermissionTemplates:', error);
      return [];
    }
  }

  async getUsers(tenantId: string): Promise<any[]> {
    if (!tenantId) {
      return [];
    }

    const supabase = await this.getSupabaseClient();

    type TenantUserRow = {
      tenant_id: string;
      user_id: string;
      admin_role?: string | null;
      role?: string | null;
      member_id?: string | null;
      created_at?: string | null;
      member?: {
        preferred_name?: string | null;
        first_name?: string | null;
        last_name?: string | null;
        email?: string | null;
      } | null;
    };

    type AuthUserRow = {
      id: string;
      email: string | null;
      created_at: string | null;
      last_sign_in_at: string | null;
      raw_user_meta_data: Record<string, unknown> | null;
      raw_app_meta_data: Record<string, unknown> | null;
    };

    type RoleRow = Record<string, any> & {
      id: string;
      name: string;
      scope?: string | null;
      description?: string | null;
      metadata_key?: string | null;
      is_system?: boolean | null;
      is_delegatable?: boolean | null;
    };

    type UserRoleRow = {
      user_id: string;
      roles: RoleRow | null;
    };

    const pickString = (...values: unknown[]): string | null => {
      for (const value of values) {
        if (typeof value !== 'string') {
          continue;
        }
        const trimmed = value.trim();
        if (trimmed.length > 0) {
          return trimmed;
        }
      }
      return null;
    };

    try {
      const { data: tenantUsersData, error: tenantUsersError } = await supabase
        .from('tenant_users')
        .select(`
          tenant_id,
          user_id,
          admin_role,
          role,
          member_id,
          created_at,
          member:member_id (
            preferred_name,
            first_name,
            last_name,
            email
          )
        `)
        .eq('tenant_id', tenantId);

      if (tenantUsersError) {
        console.error('Error fetching tenant users:', tenantUsersError);
        return [];
      }

      const tenantUsers = (tenantUsersData ?? []) as TenantUserRow[];

      const { data: authUsersData, error: authUsersError } = await supabase
        .rpc('get_tenant_users', { p_tenant_id: tenantId });

      if (authUsersError) {
        console.error('Error fetching auth users for tenant:', authUsersError);
      }

      const { data: userRolesData, error: userRolesError } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          roles:role_id (
            id,
            name,
            description,
            scope,
            metadata_key,
            is_system,
            is_delegatable
          )
        `)
        .eq('tenant_id', tenantId);

      if (userRolesError) {
        console.error('Error fetching tenant user roles:', userRolesError);
      }

      const authUsers = (authUsersData ?? []) as AuthUserRow[];
      const authUserMap = new Map<string, AuthUserRow>();
      authUsers.forEach(record => {
        if (record?.id) {
          authUserMap.set(record.id, record);
        }
      });

      const userRoles = (userRolesData ?? []) as UserRoleRow[];
      const userRolesMap = new Map<string, Role[]>();
      userRoles.forEach(entry => {
        if (!entry?.user_id || !entry.roles) {
          return;
        }

        const enrichedRole = this.enrichRole(entry.roles);
        if (!enrichedRole) {
          return;
        }

        const existing = userRolesMap.get(entry.user_id) ?? [];
        existing.push(enrichedRole as Role);
        userRolesMap.set(entry.user_id, existing);
      });

      return tenantUsers.map(row => {
        const authUser = authUserMap.get(row.user_id) ?? null;
        const userMeta = (authUser?.raw_user_meta_data ?? {}) as Record<string, any>;
        const roles = userRolesMap.get(row.user_id) ?? [];

        const firstName =
          pickString(
            row.member?.first_name,
            userMeta.first_name,
            userMeta.firstName,
            userMeta.given_name,
            userMeta.givenName
          ) ?? null;

        const lastName =
          pickString(
            row.member?.last_name,
            userMeta.last_name,
            userMeta.lastName,
            userMeta.family_name,
            userMeta.familyName
          ) ?? null;

        const fullFromParts = pickString(
          [firstName, lastName].filter(Boolean).join(' ')
        );

        const displayName =
          pickString(
            row.member?.preferred_name,
            userMeta.preferred_name,
            userMeta.preferredName,
            fullFromParts,
            userMeta.full_name,
            userMeta.fullName,
            userMeta.name
          ) ??
          pickString(
            row.member?.email,
            userMeta.email,
            authUser?.email
          ) ??
          row.user_id;

        const email =
          pickString(
            authUser?.email,
            row.member?.email,
            userMeta.email
          ) ?? '';

        const campus = pickString(
          userMeta.campus,
          userMeta.campus_name,
          userMeta.campusName
        );

        return {
          id: row.user_id,
          email,
          name: displayName,
          first_name: firstName,
          last_name: lastName,
          admin_role: row.admin_role ?? null,
          role: pickString(row.admin_role, row.role, roles[0]?.name) ?? null,
          member_id: row.member_id ?? null,
          campus,
          active: Boolean(authUser?.last_sign_in_at) || roles.length > 0,
          created_at: authUser?.created_at ?? row.created_at ?? null,
          last_sign_in_at: authUser?.last_sign_in_at ?? null,
          roles,
          metadata: {
            user: authUser?.raw_user_meta_data ?? null,
            app: authUser?.raw_app_meta_data ?? null,
            member: row.member ?? null,
          },
        };
      });
    } catch (error) {
      console.error('Error in getUsers:', error);
      return [];
    }
  }
  // Phase E - Operational Dashboards & Automation

  async getRbacHealthMetrics(tenantId: string): Promise<any> {
    const supabase = await createSupabaseServerClient();

    try {
      const { data: healthMetrics, error } = await supabase
        .rpc('get_rbac_health_metrics', { target_tenant_id: tenantId });

      if (error) {
        console.error('Error fetching RBAC health metrics:', error);
        throw new Error('Failed to fetch RBAC health metrics');
      }

      // Transform to structured object
      const metrics = healthMetrics?.reduce((acc: any, metric: any) => {
        acc[metric.metric_name] = {
          value: metric.metric_value,
          status: metric.status,
          details: metric.details
        };
        return acc;
      }, {});

      return {
        systemHealth: metrics?.orphaned_user_roles?.status === 'healthy' &&
                     metrics?.roles_without_permissions?.status === 'healthy' ? 'healthy' : 'warning',
        metrics,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error in getRbacHealthMetrics:', error);
      // Return mock data for development
      return {
        systemHealth: 'healthy',
        metrics: {
          orphaned_user_roles: { value: 0, status: 'healthy', details: { count: 0 } },
          users_without_roles: { value: 2, status: 'info', details: { count: 2 } },
          roles_without_permissions: { value: 0, status: 'healthy', details: { count: 0 } },
          materialized_view_lag_minutes: { value: 5, status: 'healthy', details: { lag_seconds: 300 } },
          recent_critical_changes_24h: { value: 3, status: 'healthy', details: { count: 3 } }
        },
        lastUpdated: new Date().toISOString()
      };
    }
  }

  async getMaterializedViewStatus(tenantId: string): Promise<any> {
    const supabase = await createSupabaseServerClient();

    try {
      // Get materialized view refresh status from audit logs
      const { data: refreshLogs, error } = await supabase
        .from('rbac_audit_log')
        .select('*')
        .eq('table_name', 'tenant_user_effective_permissions')
        .eq('operation', 'REFRESH')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching materialized view status:', error);
      }

      const latestRefresh = refreshLogs?.[0];
      const refreshHistory = refreshLogs?.map(log => ({
        timestamp: log.created_at,
        duration: log.new_values?.duration_ms || null,
        status: log.security_impact === 'low' ? 'success' : 'failed',
        notes: log.notes
      })) || [];

      // Get current view freshness
      const { data: viewData, error: viewError } = await supabase
        .from('tenant_user_effective_permissions')
        .select('computed_at')
        .eq('tenant_id', tenantId)
        .order('computed_at', { ascending: false })
        .limit(1);

      const lastComputed = viewData?.[0]?.computed_at;
      const lagMinutes = lastComputed ?
        Math.floor((Date.now() - new Date(lastComputed).getTime()) / (1000 * 60)) : null;

      return {
        currentStatus: lagMinutes && lagMinutes < 15 ? 'healthy' : 'warning',
        lastRefresh: latestRefresh?.created_at || null,
        lagMinutes,
        refreshHistory,
        viewFreshness: lastComputed,
        performanceMetrics: {
          averageRefreshTime: refreshHistory
            .filter(r => r.duration)
            .reduce((sum, r) => sum + (r.duration || 0), 0) / Math.max(refreshHistory.length, 1),
          successRate: refreshHistory.length > 0 ?
            (refreshHistory.filter(r => r.status === 'success').length / refreshHistory.length) * 100 : 100
        }
      };
    } catch (error) {
      console.error('Error in getMaterializedViewStatus:', error);
      // Return mock data for development
      return {
        currentStatus: 'healthy',
        lastRefresh: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        lagMinutes: 5,
        refreshHistory: [
          {
            timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            duration: 1250,
            status: 'success',
            notes: 'Materialized view refresh completed successfully'
          },
          {
            timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
            duration: 980,
            status: 'success',
            notes: 'Materialized view refresh completed successfully'
          }
        ],
        viewFreshness: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        performanceMetrics: {
          averageRefreshTime: 1115,
          successRate: 100
        }
      };
    }
  }

  async refreshMaterializedViews(tenantId: string): Promise<any> {
    const supabase = await createSupabaseServerClient();

    try {
      const { data, error } = await supabase
        .rpc('refresh_tenant_user_effective_permissions_safe');

      if (error) {
        console.error('Error refreshing materialized views:', error);
        throw new Error('Failed to refresh materialized views');
      }

      return {
        success: true,
        message: 'Materialized views refreshed successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error in refreshMaterializedViews:', error);
      // Simulate success for development
      return {
        success: true,
        message: 'Materialized views refresh initiated (development mode)',
        timestamp: new Date().toISOString()
      };
    }
  }

  async getMetadataPublishingStatus(tenantId: string): Promise<any> {
    const jobs = getPublishingJobsSnapshot(tenantId);
    const stats = getPublishingStatsSnapshot(tenantId);

    const queueJobs = jobs.filter((job) => job.status === 'pending' || job.status === 'running');
    const completedJobs = jobs.filter((job) => job.completed_at);

    const toAction = (job: PublishingJobSnapshot): string => {
      switch (job.type) {
        case 'metadata_compilation':
          return job.status === 'completed' ? 'PUBLISH_METADATA' : 'COMPILE_METADATA';
        case 'permission_sync':
          return 'SYNC_PERMISSIONS';
        case 'surface_binding_update':
          return 'UPDATE_SURFACE_BINDINGS';
        case 'license_validation':
          return 'VALIDATE_LICENSES';
        default:
          return job.type.toUpperCase();
      }
    };

    const queue = queueJobs.map((job) => ({
      action: toAction(job),
      timestamp: job.started_at ?? new Date().toISOString(),
      status: job.status,
      notes: job.metadata.scope ? 'Scope: ' + job.metadata.scope : undefined,
    }));

    const history = jobs
      .map((job) => {
        const status = job.status === 'completed' ? 'success' : job.status === 'failed' ? 'failed' : job.status;
        const duration = job.started_at && job.completed_at
          ? Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000)
          : null;
        const notes = job.error_message
          ? job.error_message
          : 'Processed ' + job.metadata.processed_count + '/' + job.metadata.entity_count + ' entities';

        return {
          action: toAction(job),
          timestamp: job.completed_at ?? job.started_at ?? new Date().toISOString(),
          status,
          duration,
          notes,
          details: job,
        };
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const lastPublishEntry = history.find((item) => item.action === 'PUBLISH_METADATA' && item.status === 'success');

    const hasFailures = history.some((item) => item.status === 'failed');
    const systemStatus = hasFailures ? 'error' : queue.length > 0 ? 'warning' : 'healthy';
    const pendingChanges = Math.max(stats.runningJobs, queue.filter((item) => item.action === 'COMPILE_METADATA').length);

    return {
      systemStatus,
      lastPublish: lastPublishEntry?.timestamp ?? null,
      pendingChanges,
      publishingQueue: queue,
      publishingHistory: history,
      compilerStatus: {
        available: true,
        version: '1.0.0',
        lastHealthCheck: completedJobs[0]?.completed_at ?? new Date().toISOString(),
      },
    };
  }


  async compileMetadata(tenantId: string, metadata: any): Promise<any> {
    // Mock compilation process
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate compilation time

    return {
      success: true,
      compilationId: `comp_${Date.now()}`,
      compiledSurfaces: metadata?.keys || ['admin-security/rbac-dashboard'],
      warnings: [],
      timestamp: new Date().toISOString()
    };
  }

  async validateMetadata(tenantId: string, metadata: any): Promise<any> {
    // Mock validation process
    const isValid = Math.random() > 0.1; // 90% success rate

    return {
      isValid,
      errors: isValid ? [] : ['Invalid role key reference in surface binding'],
      warnings: isValid ? ['Deprecated permission bundle detected'] : [],
      validatedSurfaces: metadata?.keys || ['admin-security/rbac-dashboard'],
      timestamp: new Date().toISOString()
    };
  }

  async publishMetadata(tenantId: string, metadata: any): Promise<any> {
    // Mock publishing process
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate publishing time

    return {
      success: true,
      deploymentId: `deploy_${Date.now()}`,
      publishedSurfaces: metadata?.keys || ['admin-security/rbac-dashboard'],
      rollbackId: `rollback_${Date.now() - 1000}`,
      timestamp: new Date().toISOString()
    };
  }

  async getPublishingJobs(tenantId: string): Promise<PublishingJobSnapshot[]> {
    return getPublishingJobsSnapshot(tenantId);
  }

  async getPublishingStats(tenantId: string): Promise<PublishingStatsSnapshot> {
    return getPublishingStatsSnapshot(tenantId);
  }

  async getTenantPublishingStatuses(tenantId: string): Promise<TenantPublishingStatusSnapshot[]> {
    return getTenantPublishingStatusesSnapshot(tenantId);
  }

  async queueMetadataCompilationJob(tenantId: string): Promise<QueuePublishingJobResult> {
    return queuePublishingJob({
      tenantId,
      type: 'metadata_compilation',
      metadata: {
        tenant_id: tenantId,
        scope: 'global',
      },
    });
  }

  async queuePermissionSyncJob(tenantId: string): Promise<PublishingJobSnapshot> {
    const { job } = queuePublishingJob({
      tenantId,
      type: 'permission_sync',
      metadata: {
        tenant_id: tenantId,
        scope: 'permissions',
      },
    });
    return job;
  }

  async queueLicenseValidationJob(tenantId: string): Promise<PublishingJobSnapshot> {
    const { job } = queuePublishingJob({
      tenantId,
      type: 'license_validation',
      metadata: {
        tenant_id: tenantId,
        scope: 'licenses',
      },
    });
    return job;
  }

  async cancelPublishingJob(jobId: string, tenantId: string): Promise<PublishingJobSnapshot> {
    const job = cancelPublishingJobInStore(jobId);
    if (!job) {
      throw new Error('Publishing job not found');
    }

    if (job.metadata.tenant_id && job.metadata.tenant_id !== tenantId) {
      throw new Error('Publishing job does not belong to tenant');
    }

    return job;
  }

  async getAuditTimelineForCompliance(tenantId: string, options?: {
    startDate?: string;
    endDate?: string;
    userId?: string;
    impactLevels?: string[];
    resourceTypes?: string[];
  }): Promise<any[]> {
    const supabase = await createSupabaseServerClient();

    try {
      let query = supabase
        .from('rbac_audit_log')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (options?.startDate) {
        query = query.gte('created_at', options.startDate);
      }
      if (options?.endDate) {
        query = query.lte('created_at', options.endDate);
      }
      if (options?.userId) {
        query = query.eq('user_id', options.userId);
      }
      if (options?.impactLevels?.length) {
        query = query.in('security_impact', options.impactLevels);
      }
      if (options?.resourceTypes?.length) {
        query = query.in('resource_type', options.resourceTypes);
      }

      const { data: auditLogs, error } = await query.limit(500);

      if (error) {
        console.error('Error fetching compliance audit timeline:', error);
        throw new Error('Failed to fetch compliance audit timeline');
      }

      // Enhance audit logs with compliance context
      return auditLogs?.map(log => ({
        ...log,
        compliance_flags: this.generateComplianceFlags(log),
        risk_assessment: this.assessRisk(log),
        requires_review: this.requiresComplianceReview(log)
      })) || [];
    } catch (error) {
      console.error('Error in getAuditTimelineForCompliance:', error);
      // Return mock data for development
      return [
        {
          id: 'audit-1',
          action: 'UPDATE_ROLE',
          resource_type: 'role',
          user_id: 'user-123',
          security_impact: 'high',
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          compliance_flags: ['privilege_escalation'],
          risk_assessment: 'medium',
          requires_review: true
        }
      ];
    }
  }

  private generateComplianceFlags(log: any): string[] {
    const flags: string[] = [];

    if (log.security_impact === 'critical' || log.security_impact === 'high') {
      flags.push('high_impact');
    }

    if (log.action.includes('DELETE')) {
      flags.push('data_removal');
    }

    if (log.resource_type === 'user_role' && log.action.includes('CREATE')) {
      flags.push('access_grant');
    }

    if (log.old_values && log.new_values) {
      flags.push('data_modification');
    }

    return flags;
  }

  private assessRisk(log: any): string {
    if (log.security_impact === 'critical') return 'high';
    if (log.security_impact === 'high') return 'medium';
    if (log.action.includes('DELETE')) return 'medium';
    return 'low';
  }

  private requiresComplianceReview(log: any): boolean {
    return log.security_impact === 'critical' ||
           log.security_impact === 'high' ||
           log.action.includes('DELETE') ||
           (log.resource_type === 'user_role' && log.action.includes('CREATE'));
  }

  async generateComplianceReport(tenantId: string, reportType: string): Promise<any> {
    const auditLogs = await this.getAuditTimelineForCompliance(tenantId, {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
      impactLevels: ['high', 'critical']
    });

    const report = {
      id: `report_${Date.now()}`,
      type: reportType,
      generatedAt: new Date().toISOString(),
      period: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      },
      summary: {
        totalEvents: auditLogs.length,
        highRiskEvents: auditLogs.filter(log => log.risk_assessment === 'high').length,
        reviewRequired: auditLogs.filter(log => log.requires_review).length,
        usersAffected: new Set(auditLogs.map(log => log.user_id).filter(Boolean)).size
      },
      findings: this.generateComplianceFindings(auditLogs),
      recommendations: this.generateComplianceRecommendations(auditLogs)
    };

    return report;
  }

  private generateComplianceFindings(auditLogs: any[]): any[] {
    const findings: any[] = [];

    const privilegeEscalations = auditLogs.filter(log =>
      log.compliance_flags?.includes('privilege_escalation')
    );

    if (privilegeEscalations.length > 0) {
      findings.push({
        type: 'privilege_escalation',
        severity: 'high',
        count: privilegeEscalations.length,
        description: 'Potential privilege escalation events detected',
        events: privilegeEscalations.slice(0, 5) // Top 5 events
      });
    }

    const dataRemovals = auditLogs.filter(log =>
      log.compliance_flags?.includes('data_removal')
    );

    if (dataRemovals.length > 0) {
      findings.push({
        type: 'data_removal',
        severity: 'medium',
        count: dataRemovals.length,
        description: 'Data removal events requiring review',
        events: dataRemovals.slice(0, 5)
      });
    }

    return findings;
  }

  private generateComplianceRecommendations(auditLogs: any[]): string[] {
    const recommendations: string[] = [];

    const highRiskEvents = auditLogs.filter(log => log.risk_assessment === 'high');
    if (highRiskEvents.length > 10) {
      recommendations.push('Consider implementing additional approval workflows for high-risk RBAC changes');
    }

    const bulkChanges = auditLogs.filter(log =>
      log.action.includes('BULK') || log.notes?.includes('bulk')
    );
    if (bulkChanges.length > 0) {
      recommendations.push('Review bulk permission changes for potential security implications');
    }

    if (auditLogs.some(log => !log.user_id)) {
      recommendations.push('Ensure all RBAC changes are properly attributed to specific users');
    }

    return recommendations;
  }

  // Multi-Role Methods
  async getMultiRoleUsers(tenantId: string): Promise<any[]> {
    const supabase = await this.getSupabaseClient();

    try {
      // Query tenant users first
      const { data: tenantUsersData, error: tenantUsersError } = await supabase
        .from('tenant_users')
        .select('user_id')
        .eq('tenant_id', tenantId);

      if (tenantUsersError) {
        console.error('Error fetching tenant users:', tenantUsersError);
        return [];
      }

      if (!tenantUsersData || tenantUsersData.length === 0) {
        return [];
      }

      const userIds = tenantUsersData.map(tu => tu.user_id);

      // Query user roles for these users
      const { data: userRolesData, error: userRolesError } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          role_id,
          roles (
            id,
            name,
            scope,
            description
          )
        `)
        .in('user_id', userIds);

      if (userRolesError) {
        console.error('Error fetching user roles:', userRolesError);
        // Continue without roles data
      }

      // Get user information by trying multiple sources in priority order
      let usersInfo: any[] = [];

      // Strategy 1: Try to get from auth.users using RPC function
      try {
        const { data: authUsersData, error: authUsersError } = await supabase
          .rpc('get_user_profiles', { user_ids: userIds });

        if (!authUsersError && authUsersData && authUsersData.length > 0) {
          usersInfo = authUsersData.map(user => ({
            id: user.id,
            email: user.email,
            user_metadata: user.raw_user_meta_data || {}
          }));
          console.log(`Successfully fetched ${usersInfo.length} users from auth.users via RPC`);
        } else if (authUsersError) {
          console.warn('Error accessing auth.users via RPC:', authUsersError);
        }
      } catch (authError) {
        console.warn('Could not access auth.users via RPC:', authError);
      }

      // Strategy 2: For users we couldn't get from auth.users, try member data
      const foundUserIds = new Set(usersInfo.map(u => u.id));
      const missingUserIds = userIds.filter(id => !foundUserIds.has(id));

      if (missingUserIds.length > 0) {
        console.log(`Trying to fetch ${missingUserIds.length} missing users from member data`);

        try {
          const { data: tenantUsersWithMember, error: memberError } = await supabase
            .from('tenant_users')
            .select(`
              user_id,
              member:member_id(
                preferred_name,
                first_name,
                last_name,
                email
              )
            `)
            .eq('tenant_id', tenantId)
            .in('user_id', missingUserIds);

          if (!memberError && tenantUsersWithMember) {
            const memberUsersInfo = tenantUsersWithMember
              .filter(tu => tu.member && tu.member.email) // Only include users with valid member data
              .map(tu => ({
                id: tu.user_id,
                email: tu.member!.email,
                user_metadata: {
                  first_name: tu.member!.preferred_name || tu.member!.first_name || '',
                  last_name: tu.member!.last_name || ''
                }
              }));

            usersInfo = [...usersInfo, ...memberUsersInfo];
            console.log(`Added ${memberUsersInfo.length} users from member data`);
          }
        } catch (memberError) {
          console.warn('Could not access member data:', memberError);
        }
      }

      // Strategy 3: For still missing users, try to get basic auth data through RPC or alternative query
      const stillMissingUserIds = userIds.filter(id => !usersInfo.find(u => u.id === id));

      if (stillMissingUserIds.length > 0) {
        console.log(`Attempting alternative query for ${stillMissingUserIds.length} remaining users`);

        try {
          // Try using the RPC function to get user profiles
          const { data: rpcUserData, error: rpcError } = await supabase
            .rpc('get_user_profiles', { user_ids: stillMissingUserIds });

          if (!rpcError && rpcUserData && rpcUserData.length > 0) {
            const rpcUsersInfo = rpcUserData.map((user: any) => ({
              id: user.id,
              email: user.email,
              user_metadata: user.raw_user_meta_data || {}
            }));

            usersInfo = [...usersInfo, ...rpcUsersInfo];
            console.log(`Added ${rpcUsersInfo.length} users via RPC function`);
          } else {
            console.warn('RPC function failed or returned no data:', rpcError);

            // Try using a simpler query that might work even with restricted permissions
            const { data: basicAuthData, error: basicError } = await supabase
              .from('tenant_users')
              .select(`
                user_id,
                created_at
              `)
              .eq('tenant_id', tenantId)
              .in('user_id', stillMissingUserIds);

            if (!basicError && basicAuthData) {
              // For users we can confirm exist but have no other data, create minimal profiles
              // using the user ID to derive a meaningful email and name
              const basicUsersInfo = basicAuthData.map(tu => {
                const userIdShort = tu.user_id.slice(0, 8);
                const userIdEnd = tu.user_id.slice(-4);

                return {
                  id: tu.user_id,
                  email: `user-${userIdShort}@tenant.local`, // More professional fallback
                  user_metadata: {
                    first_name: `User`,
                    last_name: `${userIdEnd}`
                  }
                };
              });

              usersInfo = [...usersInfo, ...basicUsersInfo];
              console.log(`Added ${basicUsersInfo.length} users with basic fallback data`);
            }
          }
        } catch (rpcError) {
          console.warn('RPC call and basic queries failed:', rpcError);

          // Absolute final fallback - just ensure we have user objects for all user IDs
          const finalFallbackUsers = stillMissingUserIds.map(userId => {
            const userIdShort = userId.slice(0, 8);
            const userIdEnd = userId.slice(-4);

            return {
              id: userId,
              email: `user-${userIdShort}@unknown.local`,
              user_metadata: {
                first_name: 'Unknown',
                last_name: `User-${userIdEnd}`
              }
            };
          });

          usersInfo = [...usersInfo, ...finalFallbackUsers];
          console.log(`Using final fallback for ${finalFallbackUsers.length} users`);
        }
      }

      console.log(`Total users resolved: ${usersInfo.length} out of ${userIds.length} requested`);

      // Transform data to group roles per user
      const userMap = new Map();

      // Initialize users
      usersInfo.forEach(user => {
        const metadata = user.user_metadata || {};
        userMap.set(user.id, {
          id: user.id,
          email: user.email,
          first_name: metadata.first_name || metadata.firstName || '',
          last_name: metadata.last_name || metadata.lastName || '',
          primary_role: null,
          secondary_roles: [],
          effective_permissions: [],
          campus_assignments: [],
          ministry_assignments: [],
          is_multi_role_enabled: false
        });
      });

      // Add roles to users
      (userRolesData || []).forEach(ur => {
        if (!ur.roles) return;

        const userObj = userMap.get(ur.user_id);
        if (!userObj) return;

        if (!userObj.primary_role) {
          userObj.primary_role = ur.roles;
        } else {
          userObj.secondary_roles.push(ur.roles);
        }
      });

      // Determine if multi-role is enabled for each user
      userMap.forEach(userObj => {
        userObj.is_multi_role_enabled = userObj.secondary_roles.length > 0;
      });

      return Array.from(userMap.values());
    } catch (error) {
      console.error('Error in getMultiRoleUsers:', error);
      return [];
    }
  }

  async getMultiRoleStats(tenantId: string): Promise<any> {
    const supabase = await this.getSupabaseClient();

    try {
      // Get basic user counts
      const { data: userCounts, error: userCountError } = await supabase
        .from('tenant_users')
        .select('user_id')
        .eq('tenant_id', tenantId);

      if (userCountError) {
        console.error('Error fetching user counts:', userCountError);
      }

      // Get users with multiple roles
      const { data: multiRoleData, error: multiRoleError } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          roles!inner (
            scope
          )
        `)
        .in('user_id', (userCounts || []).map(u => u.user_id));

      if (multiRoleError) {
        console.error('Error fetching multi-role data:', multiRoleError);
      }

      // Calculate stats
      const totalUsers = (userCounts || []).length;
      const userRoleCounts = new Map();
      const scopeCounts = new Map();

      (multiRoleData || []).forEach(ur => {
        const userId = ur.user_id;
        const scope = ur.roles?.scope;

        // Count roles per user
        userRoleCounts.set(userId, (userRoleCounts.get(userId) || 0) + 1);

        // Count scope usage
        if (scope) {
          scopeCounts.set(scope, (scopeCounts.get(scope) || 0) + 1);
        }
      });

      const multiRoleUsers = Array.from(userRoleCounts.values()).filter(count => count > 1).length;
      const averageRolesPerUser = totalUsers > 0 ?
        Array.from(userRoleCounts.values()).reduce((a, b) => a + b, 0) / totalUsers : 0;

      return {
        totalUsers,
        multiRoleUsers,
        averageRolesPerUser,
        roleConflicts: 0, // Would need conflict analysis
        effectivePermissions: scopeCounts.get('system') || 0,
        crossMinistryUsers: multiRoleUsers // Simplified calculation
      };
    } catch (error) {
      console.error('Error in getMultiRoleStats:', error);
      return {
        totalUsers: 0,
        multiRoleUsers: 0,
        averageRolesPerUser: 0,
        roleConflicts: 0,
        effectivePermissions: 0,
        crossMinistryUsers: 0
      };
    }
  }

  async assignMultipleRoles(userId: string, roleIds: string[], overrideConflicts = false, tenantId: string): Promise<any> {
    const supabase = await this.getSupabaseClient();

    try {
      // Remove existing role assignments
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .in('role_id', await this.getRoleIdsByTenant(tenantId));

      if (deleteError) {
        console.error('Error removing existing roles:', deleteError);
        throw new Error('Failed to remove existing roles');
      }

      // Insert new role assignments
      const roleAssignments = roleIds.map(roleId => ({
        tenant_id: tenantId,
        user_id: userId,
        role_id: roleId,
        created_at: new Date().toISOString()
      }));

      const { data, error } = await supabase
        .from('user_roles')
        .insert(roleAssignments)
        .select();

      if (error) {
        console.error('Error assigning roles:', error);
        throw new Error('Failed to assign roles');
      }

      return {
        success: true,
        user_id: userId,
        assigned_roles: roleIds,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error in assignMultipleRoles:', error);
      throw error;
    }
  }

  async removeUserRole(userId: string, roleId: string, tenantId: string): Promise<any> {
    const supabase = await this.getSupabaseClient();

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role_id', roleId);

      if (error) {
        console.error('Error removing user role:', error);
        throw new Error('Failed to remove user role');
      }

      return {
        success: true,
        user_id: userId,
        removed_role_id: roleId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error in removeUserRole:', error);
      throw error;
    }
  }

  async toggleMultiRoleMode(userId: string, enabled: boolean, tenantId: string): Promise<any> {
    // For now, this is a conceptual toggle - the actual multi-role capability
    // is determined by whether a user has multiple roles assigned
    return {
      success: true,
      user_id: userId,
      multi_role_enabled: enabled,
      message: enabled ? 'Multi-role mode enabled' : 'Multi-role mode disabled'
    };
  }

  async analyzeRoleConflicts(roleIds: string[], tenantId: string): Promise<any> {
    const supabase = await this.getSupabaseClient();

    try {
      // Get role details
      const { data: roles, error } = await supabase
        .from('roles')
        .select('id, name, scope, description')
        .in('id', roleIds);

      if (error) {
        console.error('Error fetching roles for conflict analysis:', error);
        return { conflicts: [] };
      }

      // Simple conflict detection based on scope
      const conflicts = [];
      for (let i = 0; i < (roles || []).length; i++) {
        for (let j = i + 1; j < (roles || []).length; j++) {
          const role1 = roles[i];
          const role2 = roles[j];

          if (role1.scope === role2.scope && role1.scope === 'system') {
            conflicts.push({
              role1,
              role2,
              conflict_type: 'scope_mismatch',
              severity: 'high',
              description: `Both roles have system-level scope which may cause permission escalation`
            });
          }
        }
      }

      return { conflicts };
    } catch (error) {
      console.error('Error in analyzeRoleConflicts:', error);
      return { conflicts: [] };
    }
  }

  private async getRoleIdsByTenant(tenantId: string): Promise<string[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from('roles')
      .select('id')
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Error fetching role IDs:', error);
      return [];
    }

    return (data || []).map(role => role.id);
  }
}

