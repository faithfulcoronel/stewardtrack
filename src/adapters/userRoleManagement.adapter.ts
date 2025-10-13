import 'server-only';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { TYPES } from '@/lib/types';
import type { AuditService } from '@/services/AuditService';
import type {
  UserRole,
  AssignRoleDto,
  Role,
  UserWithRoles,
  Permission
} from '@/models/rbac.model';

/**
 * UserRoleManagement Adapter - Handles user-role assignments and multi-role functionality
 * Consolidated adapter that combines user role management and RBAC permission checks
 * This is the single source of truth for user role operations
 */
export interface IUserRoleManagementAdapter extends IBaseAdapter<UserRole> {
  // Role assignment operations
  assignRole(data: AssignRoleDto, tenantId: string, assignedBy?: string): Promise<UserRole>;
  revokeRole(userId: string, roleId: string, tenantId: string): Promise<void>;
  getUserRoles(userId: string, tenantId: string): Promise<Role[]>;
  getUsersWithRole(roleId: string, tenantId: string): Promise<any[]>;
  getUserWithRoles(userId: string, tenantId: string): Promise<UserWithRoles | null>;
  removeUserRole(userId: string, roleId: string, tenantId: string): Promise<any>;
  getMultiRoleUsers(tenantId: string): Promise<any[]>;
  assignMultipleRoles(userId: string, roleIds: string[], tenantId: string): Promise<any>;
  toggleMultiRoleMode(userId: string, enabled: boolean, tenantId: string): Promise<any>;
  getUserMultiRoleContext(userId: string, tenantId: string): Promise<any>;
  getUsers(tenantId: string): Promise<any[]>;

  // RBAC permission checks (merged from userRole.adapter)
  getRoleDetailsByUser(userId: string, tenantId?: string): Promise<{ role_id: string; role_name: string }[]>;
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

type RoleFlagFields = Pick<Role, "is_system" | "is_delegatable">;

@injectable()
export class UserRoleManagementAdapter extends BaseAdapter<UserRole> implements IUserRoleManagementAdapter {
  constructor(
    @inject(TYPES.AuditService) private auditService: AuditService
  ) {
    super();
  }

  protected tableName = 'user_roles';
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

      // Combine user role data with user information
      return userRolesData
        .map(ur => {
          const userInfo = usersInfo.find(u => u.id === ur.user_id);
          if (!userInfo) return null;

          return {
            id: ur.id,
            user_id: ur.user_id,
            assigned_at: ur.assigned_at,
            assigned_by: ur.assigned_by,
            user: {
              id: userInfo.id,
              email: userInfo.email,
              first_name: userInfo.first_name,
              last_name: userInfo.last_name
            }
          };
        })
        .filter(Boolean);
    } catch (error) {
      console.error('Error in getUsersWithRole:', error);
      return [];
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
              .filter(tu => tu.member && tu.member.email)
              .map(tu => ({
                id: tu.user_id,
                email: tu.member!.email,
                user_metadata: {
                  first_name: tu.member!.preferred_name || tu.member!.first_name || '',
                  last_name: tu.member!.last_name || ''
                }
              }));

            usersInfo = [...usersInfo, ...memberUsersInfo];
            console.log(`Successfully fetched ${memberUsersInfo.length} additional users from member data`);
          }
        } catch (memberError) {
          console.warn('Could not access member data:', memberError);
        }
      }

      // Map user IDs to role counts
      const userRoleCounts = new Map<string, number>();
      userRolesData?.forEach(ur => {
        const count = userRoleCounts.get(ur.user_id) || 0;
        userRoleCounts.set(ur.user_id, count + 1);
      });

      // Filter users with multiple roles
      const multiRoleUserIds = Array.from(userRoleCounts.entries())
        .filter(([_, count]) => count > 1)
        .map(([userId, _]) => userId);

      // Build final result
      return multiRoleUserIds
        .map(userId => {
          const userInfo = usersInfo.find(u => u.id === userId);
          const userRoles = userRolesData?.filter(ur => ur.user_id === userId) || [];

          if (!userInfo) return null;

          return {
            id: userId,
            email: userInfo.email,
            first_name: userInfo.user_metadata?.first_name || userInfo.user_metadata?.firstName || '',
            last_name: userInfo.user_metadata?.last_name || userInfo.user_metadata?.lastName || '',
            roles: userRoles.map(ur => this.enrichRole(ur.roles)),
            role_count: userRoles.length
          };
        })
        .filter(Boolean);
    } catch (error) {
      console.error('Error in getMultiRoleUsers:', error);
      return [];
    }
  }

  async assignMultipleRoles(userId: string, roleIds: string[], tenantId: string): Promise<any> {
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

      const tenantUsers = (tenantUsersData || []) as TenantUserRow[];

      if (tenantUsers.length === 0) {
        return [];
      }

      const userIds = tenantUsers.map(tu => tu.user_id);

      // Fetch auth.users data via RPC
      let authUsersMap = new Map<string, AuthUserRow>();
      try {
        const { data: authUsersData, error: authUsersError } = await supabase
          .rpc('get_user_profiles', { user_ids: userIds });

        if (!authUsersError && authUsersData) {
          authUsersData.forEach((user: AuthUserRow) => {
            authUsersMap.set(user.id, user);
          });
        }
      } catch (authError) {
        console.warn('Could not access auth.users via RPC:', authError);
      }

      // Fetch user roles
      const { data: userRolesData, error: userRolesError } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          roles (
            id,
            name,
            scope,
            description,
            metadata_key,
            is_system,
            is_delegatable
          )
        `)
        .in('user_id', userIds);

      if (userRolesError) {
        console.error('Error fetching user roles:', userRolesError);
      }

      const userRoles = (userRolesData || []) as UserRoleRow[];
      const rolesByUserId = new Map<string, RoleRow[]>();

      userRoles.forEach(ur => {
        if (!ur.roles) return;
        const existing = rolesByUserId.get(ur.user_id) || [];
        rolesByUserId.set(ur.user_id, [...existing, ur.roles]);
      });

      // Build final user list
      return tenantUsers.map(tu => {
        const authUser = authUsersMap.get(tu.user_id);
        const roles = rolesByUserId.get(tu.user_id) || [];

        // Try to get email from multiple sources
        const email = pickString(
          authUser?.email,
          tu.member?.email
        ) || 'unknown@example.com';

        // Try to get name from multiple sources
        const firstName = pickString(
          authUser?.raw_user_meta_data?.first_name as string,
          authUser?.raw_user_meta_data?.firstName as string,
          tu.member?.preferred_name,
          tu.member?.first_name
        ) || '';

        const lastName = pickString(
          authUser?.raw_user_meta_data?.last_name as string,
          authUser?.raw_user_meta_data?.lastName as string,
          tu.member?.last_name
        ) || '';

        return {
          id: tu.user_id,
          email,
          first_name: firstName,
          last_name: lastName,
          member_id: tu.member_id,
          legacy_admin_role: tu.admin_role,
          legacy_role: tu.role,
          roles: this.enrichRoleList(roles),
          created_at: authUser?.created_at || tu.created_at || null,
          last_sign_in_at: authUser?.last_sign_in_at || null
        };
      });
    } catch (error) {
      console.error('Error in getUsers:', error);
      return [];
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

  // ========================================
  // RBAC Permission Methods (merged from userRole.adapter.ts)
  // ========================================

  async getRoleDetailsByUser(
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

  async getAdminRole(
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

  async getRolesWithPermissions(userId: string, tenantId?: string): Promise<any[]> {
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
  async isSuperAdmin(): Promise<boolean> {
    // Import dynamically to avoid circular dependency
    const { checkSuperAdmin } = await import('@/lib/rbac/permissionHelpers');
    return await checkSuperAdmin();
  }

  async isAdmin(userId: string): Promise<boolean> {
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

  async canUser(permission: string, tenantId?: string): Promise<boolean> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc('can_user', {
      required_permission: permission,
      target_tenant_id: tenantId || null,
    });
    if (error) throw error;
    return Boolean(data);
  }

  async canUserFast(permission: string, tenantId?: string): Promise<boolean> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc('can_user_fast', {
      required_permission: permission,
      target_tenant_id: tenantId || null,
    });
    if (error) throw error;
    return Boolean(data);
  }

  async canUserAny(permissions: string[], tenantId?: string): Promise<boolean> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc('can_user_any', {
      required_permissions: permissions,
      target_tenant_id: tenantId || null,
    });
    if (error) throw error;
    return Boolean(data);
  }

  async canUserAll(permissions: string[], tenantId?: string): Promise<boolean> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc('can_user_all', {
      required_permissions: permissions,
      target_tenant_id: tenantId || null,
    });
    if (error) throw error;
    return Boolean(data);
  }

  /**
   * Get user effective permissions using the RBAC database functions
   * This method respects all RBAC configurations including role permissions,
   * permission bundles, and delegation rules
   */
  async getUserEffectivePermissions(userId: string, tenantId?: string): Promise<any[]> {
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

  async getUserRoleMetadataKeys(userId: string, tenantId?: string): Promise<string[]> {
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

  async getUserAccessibleMenuItems(userId: string, tenantId?: string): Promise<any[]> {
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

  async getUserAccessibleMetadataSurfaces(userId: string, tenantId?: string): Promise<any[]> {
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

  async replaceUserRoles(
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

  async getRolesByUser(userId: string, tenantId?: string): Promise<string[]> {
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

  async getUsersByRole(roleId: string): Promise<UserRole[]> {
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
