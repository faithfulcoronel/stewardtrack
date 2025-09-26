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
    tenantId: string,
    filters?: {
      module?: string;
      phase?: string;
      surface_type?: string;
    }
  ): Promise<MetadataSurface[]> {
    const supabase = await this.getSupabaseClient();

    let query = supabase
      .from('metadata_surfaces')
      .select('*')
      .or(`is_system.eq.true,tenant_id.eq.${tenantId}`);

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

    // Mock implementation - in reality this would query based on delegation scope
    const mockUsers = [
      {
        id: 'user-1',
        email: 'john.doe@church.org',
        first_name: 'John',
        last_name: 'Doe',
        effective_scope: 'campus',
        campus_id: 'campus-1',
        delegated_roles: [
          { id: 'role-1', name: 'Campus Volunteer Coordinator', scope: 'campus' }
        ]
      },
      {
        id: 'user-2',
        email: 'jane.smith@church.org',
        first_name: 'Jane',
        last_name: 'Smith',
        effective_scope: 'ministry',
        ministry_id: 'ministry-1',
        delegated_roles: [
          { id: 'role-2', name: 'Youth Leader', scope: 'ministry' },
          { id: 'role-3', name: 'Event Coordinator', scope: 'ministry' }
        ]
      }
    ];

    return mockUsers;
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

  // Multi-Role Methods
  async getMultiRoleUsers(tenantId: string): Promise<any[]> {
    const supabase = await this.getSupabaseClient();

    // Mock implementation - would query users with multiple role assignments
    const mockMultiRoleUsers = [
      {
        id: 'user-1',
        email: 'multi.role@church.org',
        first_name: 'Multi',
        last_name: 'Role',
        primary_role: { id: 'role-1', name: 'Campus Pastor', scope: 'campus' },
        secondary_roles: [
          { id: 'role-2', name: 'Youth Leader', scope: 'ministry' },
          { id: 'role-3', name: 'Worship Leader', scope: 'ministry' }
        ],
        effective_permissions: [],
        campus_assignments: ['campus-1'],
        ministry_assignments: ['ministry-1', 'ministry-2'],
        is_multi_role_enabled: true
      },
      {
        id: 'user-2',
        email: 'single.role@church.org',
        first_name: 'Single',
        last_name: 'Role',
        primary_role: { id: 'role-4', name: 'Volunteer', scope: 'ministry' },
        secondary_roles: [],
        effective_permissions: [],
        campus_assignments: ['campus-1'],
        ministry_assignments: ['ministry-1'],
        is_multi_role_enabled: false
      }
    ];

    return mockMultiRoleUsers;
  }

  async assignMultipleRoles(userId: string, roleIds: string[], tenantId: string): Promise<any> {
    const supabase = await this.getSupabaseClient();

    // In a real implementation, this would:
    // 1. Clear existing role assignments (except primary)
    // 2. Assign new roles
    // 3. Update multi-role context
    // 4. Refresh permission cache

    const mockResult = {
      user_id: userId,
      assigned_roles: roleIds,
      conflicts_resolved: 0,
      effective_permissions_count: roleIds.length * 5 // Mock calculation
    };

    return mockResult;
  }

  async removeUserRole(userId: string, roleId: string, tenantId: string): Promise<any> {
    const supabase = await this.getSupabaseClient();

    // In a real implementation, this would:
    // 1. Remove the role assignment from user_roles table
    // 2. Update multi-role context if needed
    // 3. Refresh permission cache

    const mockResult = {
      user_id: userId,
      removed_role_id: roleId,
      tenant_id: tenantId,
      removed_at: new Date().toISOString()
    };

    return mockResult;
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
    // Mock data for demonstration
    const mockDelegationPermissions = [
      {
        id: 'delegation-1',
        delegator_id: 'user-1',
        delegatee_id: 'user-2',
        delegator_name: 'Senior Pastor Johnson',
        delegatee_name: 'Campus Pastor Smith',
        scope_type: 'campus',
        scope_id: 'campus-1',
        scope_name: 'Main Campus',
        permissions: ['users.read', 'users.write', 'roles.read'],
        restrictions: ['Cannot modify admin roles', 'Limited to campus users only'],
        expiry_date: '2024-12-31',
        is_active: true,
        created_at: '2024-01-15T10:00:00Z',
        last_used: '2024-09-20T14:30:00Z'
      },
      {
        id: 'delegation-2',
        delegator_id: 'user-3',
        delegatee_id: 'user-4',
        delegator_name: 'Ministry Director Brown',
        delegatee_name: 'Youth Leader Davis',
        scope_type: 'ministry',
        scope_id: 'ministry-1',
        scope_name: 'Youth Ministry',
        permissions: ['users.read', 'roles.read', 'delegation.read'],
        restrictions: ['Youth ministry scope only'],
        is_active: true,
        created_at: '2024-02-01T09:00:00Z',
        last_used: '2024-09-25T16:45:00Z'
      }
    ];

    return mockDelegationPermissions;
  }

  async createDelegationPermission(permissionData: any, tenantId: string): Promise<any> {
    // In a real implementation, this would insert into delegation_permissions table
    const newPermission = {
      id: `delegation-${Date.now()}`,
      ...permissionData,
      delegator_id: 'current-user-id', // Would come from auth context
      delegator_name: 'Current User',
      is_active: true,
      created_at: new Date().toISOString()
    };

    return newPermission;
  }

  async updateDelegationPermission(id: string, permissionData: any, tenantId: string): Promise<any> {
    // Mock update - would update delegation_permissions table
    return {
      id,
      ...permissionData,
      updated_at: new Date().toISOString()
    };
  }

  async revokeDelegationPermission(id: string, tenantId: string): Promise<void> {
    // Mock revocation - would set is_active = false or delete record
    console.log(`Revoking delegation permission: ${id} for tenant: ${tenantId}`);
  }

  async getPermissionTemplates(tenantId: string): Promise<any[]> {
    // Mock permission templates
    const mockTemplates = [
      {
        id: 'template-1',
        name: 'Campus Manager',
        description: 'Standard permissions for campus management',
        scope_type: 'campus',
        permissions: ['users.read', 'users.write', 'roles.read', 'roles.write'],
        restrictions: ['Cannot modify system roles', 'Campus scope only']
      },
      {
        id: 'template-2',
        name: 'Ministry Leader',
        description: 'Basic permissions for ministry leadership',
        scope_type: 'ministry',
        permissions: ['users.read', 'roles.read', 'audit.read'],
        restrictions: ['Ministry scope only', 'Read-only access to sensitive data']
      },
      {
        id: 'template-3',
        name: 'Department Admin',
        description: 'Administrative permissions for department management',
        scope_type: 'department',
        permissions: ['users.read', 'users.write', 'permissions.read'],
        restrictions: ['Department scope only']
      }
    ];

    return mockTemplates;
  }

  async getUsers(tenantId: string): Promise<any[]> {
    // Mock users data for demonstration
    const mockUsers = [
      {
        id: 'user-1',
        name: 'Pastor John Smith',
        email: 'john.smith@church.org',
        role: 'Senior Pastor',
        campus: 'Main Campus',
        active: true
      },
      {
        id: 'user-2',
        name: 'Sarah Johnson',
        email: 'sarah.johnson@church.org',
        role: 'Campus Pastor',
        campus: 'Downtown Campus',
        active: true
      },
      {
        id: 'user-3',
        name: 'Mike Wilson',
        email: 'mike.wilson@church.org',
        role: 'Youth Pastor',
        campus: 'Main Campus',
        active: true
      },
      {
        id: 'user-4',
        name: 'Emily Davis',
        email: 'emily.davis@church.org',
        role: 'Worship Leader',
        campus: 'Downtown Campus',
        active: true
      },
      {
        id: 'user-5',
        name: 'David Brown',
        email: 'david.brown@church.org',
        role: 'Care Pastor',
        campus: 'Main Campus',
        active: false
      }
    ];

    return mockUsers;
  }
}









