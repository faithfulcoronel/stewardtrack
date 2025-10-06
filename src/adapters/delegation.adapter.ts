import 'server-only';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { TYPES } from '@/lib/types';
import type { AuditService } from '@/services/AuditService';
import type {
  DelegatedContext,
  UserWithRoles,
  Role
} from '@/models/rbac.model';

export interface IDelegationAdapter extends IBaseAdapter<any> {
  getDelegatedContext(userId: string, tenantId: string): Promise<DelegatedContext | null>;
  getUsersInDelegatedScope(delegatedContext: DelegatedContext): Promise<UserWithRoles[]>;
  getDelegationScopes(delegatedContext: any): Promise<any[]>;
  getDelegatedUsers(delegatedContext: any): Promise<any[]>;
  getDelegationRoles(delegatedContext: DelegatedContext): Promise<Role[]>;
  getDelegationStats(delegatedContext: DelegatedContext): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalRoles: number;
    delegatableRoles: number;
    scopeCount: number;
    recentChanges: number;
  }>;
  assignDelegatedRole(params: {
    delegatorId: string;
    delegateeId: string;
    roleId: string;
    scopeId?: string;
    context: DelegatedContext;
  }): Promise<{ success: boolean; assignment: any }>;
  revokeDelegatedRole(params: {
    delegatorId: string;
    delegateeId: string;
    roleId: string;
    context: DelegatedContext;
  }): Promise<{ success: boolean }>;
  getDelegationPermissions(tenantId: string): Promise<any[]>;
  createDelegationPermission(permissionData: any, tenantId: string): Promise<any>;
  updateDelegationPermission(id: string, permissionData: any, tenantId: string): Promise<any>;
  revokeDelegationPermission(id: string, tenantId: string): Promise<void>;
  getPermissionTemplates(tenantId: string): Promise<any[]>;
}

@injectable()
export class DelegationAdapter extends BaseAdapter<any> implements IDelegationAdapter {
  constructor(
    @inject(TYPES.AuditService) private auditService: AuditService
  ) {
    super();
  }

  protected tableName = 'delegation_permissions';
  protected defaultSelect = `*`;

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
        const userRecord = Array.isArray(tu.users) ? tu.users[0] : tu.users;
        const metadata = (userRecord?.user_metadata as Record<string, any>) || {};
        const userDelegations = delegationsData.filter(d => d.delegatee_id === tu.user_id);

        return {
          id: userRecord?.id,
          email: userRecord?.email,
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

    return mockRoles.filter(role =>
      delegatedContext.allowed_roles.includes(role.id)
    );
  }

  async getDelegationStats(delegatedContext: DelegatedContext): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalRoles: number;
    delegatableRoles: number;
    scopeCount: number;
    recentChanges: number;
  }> {
    const users = await this.getDelegatedUsers(delegatedContext);
    const roles = await this.getDelegationRoles(delegatedContext);
    const scopes = await this.getDelegationScopes(delegatedContext);

    return {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.delegated_permissions?.length > 0).length,
      totalRoles: roles.length,
      delegatableRoles: roles.filter(r => r.is_delegatable).length,
      scopeCount: scopes.length,
      recentChanges: 0 // Would need to query audit logs
    };
  }

  async assignDelegatedRole(params: {
    delegatorId: string;
    delegateeId: string;
    roleId: string;
    scopeId?: string;
    context: DelegatedContext;
  }): Promise<{ success: boolean; assignment: any }> {
    const assignment: any = {
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
}
