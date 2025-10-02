import 'server-only';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { TYPES } from '@/lib/types';
import type { AuditService } from '@/services/audit.service';
import type {
  UserRole,
  AssignRoleDto,
  Role,
  UserWithRoles,
  Permission
} from '@/models/rbac.model';

/**
 * UserRoleManagement Adapter - Handles user-role assignments and multi-role functionality
 * Extracted from rbac.repository.ts for Phase 1 RBAC refactoring
 */
export interface IUserRoleManagementAdapter extends IBaseAdapter<UserRole> {
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
            email: userInfo.email,
            first_name: userInfo.first_name,
            last_name: userInfo.last_name,
            assigned_at: ur.assigned_at,
            assigned_by: ur.assigned_by
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

  private async getUserEffectivePermissions(userId: string, tenantId: string): Promise<Permission[]> {
    const supabase = await this.getSupabaseClient();

    try {
      // Get all role IDs for this user
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role_id')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId);

      if (rolesError || !userRoles || userRoles.length === 0) {
        return [];
      }

      const roleIds = userRoles.map(ur => ur.role_id);

      // Get direct permissions from roles
      const { data: rolePermissions, error: permissionsError } = await supabase
        .from('role_permissions')
        .select(`
          permissions (*)
        `)
        .in('role_id', roleIds)
        .eq('tenant_id', tenantId);

      if (permissionsError) {
        console.error('Error fetching role permissions:', permissionsError);
        return [];
      }

      // Get permissions from bundles
      const { data: roleBundles, error: bundlesError } = await supabase
        .from('role_bundles')
        .select('bundle_id')
        .in('role_id', roleIds)
        .eq('tenant_id', tenantId);

      let bundlePermissions: any[] = [];
      if (!bundlesError && roleBundles && roleBundles.length > 0) {
        const bundleIds = roleBundles.map(rb => rb.bundle_id);

        const { data: bundlePerms, error: bundlePermsError } = await supabase
          .from('bundle_permissions')
          .select(`
            permissions (*)
          `)
          .in('bundle_id', bundleIds)
          .eq('tenant_id', tenantId);

        if (!bundlePermsError && bundlePerms) {
          bundlePermissions = bundlePerms;
        }
      }

      // Combine and deduplicate permissions
      const allPermissions = [
        ...(rolePermissions?.map((rp: any) => rp.permissions) || []),
        ...(bundlePermissions?.map((bp: any) => bp.permissions) || [])
      ];

      const uniquePermissions = Array.from(
        new Map(allPermissions.map(p => [p.id, p])).values()
      );

      return uniquePermissions;
    } catch (error) {
      console.error('Error fetching effective permissions:', error);
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
}
