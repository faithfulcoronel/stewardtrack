import 'server-only';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { TYPES } from '@/lib/types';
import type { AuditService } from '@/services/AuditService';
import type {
  DelegatedContext,
  UserWithRoles,
  Role,
  Permission
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

  private roleCache = new Map<string, Role[]>();

  private mapRoleScope(rawScope: string | null | undefined, fallbackScope?: DelegatedContext['scope']): Role['scope'] {
    if (rawScope === 'system' || rawScope === 'tenant' || rawScope === 'campus' || rawScope === 'ministry') {
      return rawScope;
    }

    if (rawScope === 'delegated' && fallbackScope) {
      return fallbackScope;
    }

    return fallbackScope ?? 'tenant';
  }

  private async loadDelegatableRoles(context: DelegatedContext, scopeOverride?: DelegatedContext['scope']): Promise<Role[]> {
    const targetScope = scopeOverride ?? context.scope;
    const cacheKey = `${context.tenant_id}:${targetScope ?? 'all'}`;
    if (this.roleCache.has(cacheKey)) {
      return this.roleCache.get(cacheKey)!;
    }

    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase
      .from('roles')
      .select('id, tenant_id, name, description, scope, metadata_key, is_system, is_delegatable, is_active, created_at, updated_at, deleted_at')
      .eq('tenant_id', context.tenant_id);

    if (error) {
      throw new Error(`Failed to load delegatable roles: ${error.message}`);
    }

    const normalized = (data ?? [])
      .filter(role => Boolean(role.is_delegatable ?? false))
      .filter(role => (role.is_active ?? true) && !role.deleted_at)
      .map<Role>((role) => ({
        id: role.id,
        tenant_id: role.tenant_id,
        name: role.name,
        description: role.description ?? undefined,
        metadata_key: role.metadata_key ?? undefined,
        scope: this.mapRoleScope(role.scope, targetScope),
        is_system: role.is_system ?? false,
        is_delegatable: role.is_delegatable ?? false,
        created_at: role.created_at,
        updated_at: role.updated_at
      }))
      .filter(role => !targetScope || role.scope === targetScope);

    this.roleCache.set(cacheKey, normalized);
    return normalized;
  }

  private async fetchDelegationScopes(context: DelegatedContext) {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase
      .from('delegation_scopes')
      .select('id, name, type, parent_id, is_active')
      .eq('tenant_id', context.tenant_id)
      .eq('is_active', true);

    if (error) {
      throw new Error(`Failed to load delegation scopes: ${error.message}`);
    }

    return data ?? [];
  }

  private filterScopesForContext(context: DelegatedContext, scopes: Array<{ id: string; type: string; parent_id?: string | null }>) {
    return scopes.filter(scope => {
      if (context.scope === 'campus') {
        if (!context.scope_id) {
          return scope.type === 'campus' || scope.type === 'ministry';
        }

        if (scope.type === 'campus') {
          return scope.id === context.scope_id;
        }

        if (scope.type === 'ministry') {
          return scope.parent_id === context.scope_id;
        }

        return false;
      }

      if (context.scope === 'ministry') {
        return context.scope_id ? scope.id === context.scope_id : scope.type === 'ministry';
      }

      return false;
    });
  }

  async getDelegatedContext(userId: string, tenantId: string): Promise<DelegatedContext | null> {
    if (!userId || !tenantId) {
      return null;
    }

    const normalizeScope = (scope?: string | null): 'campus' | 'ministry' => {
      if (scope === 'ministry' || scope === 'department' || scope === 'program') {
        return 'ministry';
      }
      return 'campus';
    };

    try {
      const supabase = await this.getSupabaseClient();
      const { data, error } = await supabase
        .from('delegation_permissions')
        .select('scope_type, scope_id')
        .eq('tenant_id', tenantId)
        .eq('delegatee_id', userId)
        .eq('is_active', true);

      if (error) {
        throw new Error(`Failed to load delegation context: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return null;
      }

      const prioritized = data.find(entry => entry.scope_type === 'campus') ?? data[0];
      const resolvedScope = normalizeScope(prioritized.scope_type);

      const context: DelegatedContext = {
        user_id: userId,
        tenant_id: tenantId,
        scope: resolvedScope,
        scope_id: prioritized.scope_id ?? undefined,
        allowed_roles: [],
        allowed_bundles: []
      };

      const allowedRoles = await this.loadDelegatableRoles(context, resolvedScope);
      context.allowed_roles = allowedRoles.map(role => role.id);

      return context;
    } catch (error) {
      console.error('[DelegationAdapter] Error resolving delegated context:', error);
      return null;
    }
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

  async getDelegationScopes(delegatedContext: DelegatedContext): Promise<any[]> {
    try {
      const [rawScopes, delegatedUsers, delegatableRoles] = await Promise.all([
        this.fetchDelegationScopes(delegatedContext),
        this.getDelegatedUsers(delegatedContext),
        this.getDelegationRoles(delegatedContext)
      ]);

      if (!rawScopes.length) {
        return [];
      }

      const relevantScopes = this.filterScopesForContext(delegatedContext, rawScopes);

      return relevantScopes.map(scope => {
        const roleCount = delegatableRoles.filter(role => role.scope === scope.type).length;
        const userCount = delegatedUsers.filter(user => {
          const effectiveScope = user.effective_scope ?? delegatedContext.scope;
          if (scope.type === 'campus') {
            return effectiveScope === 'campus';
          }
          if (scope.type === 'ministry') {
            return effectiveScope === 'ministry';
          }
          return false;
        }).length;

        return {
          id: scope.id,
          name: scope.name,
          type: scope.type,
          parent_id: scope.parent_id,
          user_count: userCount,
          role_count: roleCount
        };
      });
    } catch (error) {
      console.error('[DelegationAdapter] Error loading delegation scopes:', error);
      return [];
    }
  }

  async getDelegatedUsers(delegatedContext: DelegatedContext): Promise<any[]> {
    try {
      let roleCatalog = await this.loadDelegatableRoles(delegatedContext);
      const allowedRoleIds = delegatedContext.allowed_roles?.length
        ? delegatedContext.allowed_roles
        : roleCatalog.map(role => role.id);

      if (!allowedRoleIds.length) {
        return [];
      }

      if (delegatedContext.allowed_roles?.length) {
        roleCatalog = roleCatalog.filter(role => allowedRoleIds.includes(role.id));
      }

      const supabase = await this.getSupabaseClient();
      const { data, error } = await supabase
        .from('user_roles')
        .select('id, user_id, role_id, assigned_at, is_active, roles:role_id (id, tenant_id, name, description, scope, metadata_key, is_system, is_delegatable, created_at, updated_at), users:user_id (id, email, user_metadata)')
        .eq('tenant_id', delegatedContext.tenant_id)
        .eq('is_active', true)
        .in('role_id', allowedRoleIds)
        .order('assigned_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch delegated users: ${error.message}`);
      }

      const roleMap = new Map(roleCatalog.map(role => [role.id, role]));
      const userMap = new Map<string, any>();

      for (const record of data ?? []) {
        const userRecord = record.users;
        if (!userRecord) {
          continue;
        }

        const roleFromCatalog = roleMap.get(record.role_id);
        let normalizedRole: Role | null = null;

        if (roleFromCatalog) {
          normalizedRole = roleFromCatalog;
        } else if (record.roles) {
          normalizedRole = {
            id: record.roles.id,
            tenant_id: record.roles.tenant_id,
            name: record.roles.name,
            description: record.roles.description ?? undefined,
            metadata_key: record.roles.metadata_key ?? undefined,
            scope: this.mapRoleScope(record.roles.scope, delegatedContext.scope),
            is_system: record.roles.is_system ?? false,
            is_delegatable: record.roles.is_delegatable ?? false,
            created_at: record.roles.created_at,
            updated_at: record.roles.updated_at
          } as Role;
        }

        const metadata = userRecord.user_metadata ?? {};
        const existing = userMap.get(userRecord.id);
        const baseUser = existing ?? {
          id: userRecord.id,
          email: userRecord.email ?? '',
          first_name: metadata.first_name ?? metadata.firstName ?? '',
          last_name: metadata.last_name ?? metadata.lastName ?? '',
          roles: [] as Role[],
          effective_permissions: [] as Permission[],
          delegated_roles: [] as Role[],
          effective_scope: delegatedContext.scope,
          campus_id: delegatedContext.scope === 'campus' ? delegatedContext.scope_id : undefined,
          ministry_id: delegatedContext.scope === 'ministry' ? delegatedContext.scope_id : undefined
        };

        if (normalizedRole) {
          const hasRole = baseUser.delegated_roles.some(role => role.id === normalizedRole!.id);
          if (!hasRole) {
            baseUser.delegated_roles = [...baseUser.delegated_roles, normalizedRole];
            baseUser.roles = [...baseUser.roles, normalizedRole];
          }

          if (normalizedRole.scope === 'campus' || normalizedRole.scope === 'ministry') {
            baseUser.effective_scope = normalizedRole.scope;
          }
        }

        userMap.set(userRecord.id, baseUser);
      }

      return Array.from(userMap.values()).sort((a, b) => {
        const aName = (a.first_name || a.email || '').toLowerCase();
        const bName = (b.first_name || b.email || '').toLowerCase();
        return aName.localeCompare(bName);
      });
    } catch (error) {
      console.error('[DelegationAdapter] Error fetching delegated users:', error);
      return [];
    }
  }

  async getDelegationRoles(delegatedContext: DelegatedContext): Promise<Role[]> {
    try {
      const roles = await this.loadDelegatableRoles(delegatedContext);
      if (delegatedContext.allowed_roles?.length) {
        return roles.filter(role => delegatedContext.allowed_roles.includes(role.id));
      }
      return roles;
    } catch (error) {
      console.error('[DelegationAdapter] Error fetching delegation roles:', error);
      return [];
    }
  }

  async getDelegationStats(delegatedContext: DelegatedContext): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalRoles: number;
    delegatableRoles: number;
    scopeCount: number;
    recentChanges: number;
  }> {
    try {
      const [users, roles, rawScopes] = await Promise.all([
        this.getDelegatedUsers(delegatedContext),
        this.getDelegationRoles(delegatedContext),
        this.fetchDelegationScopes(delegatedContext)
      ]);

      const filteredScopes = this.filterScopesForContext(delegatedContext, rawScopes);

      const supabase = await this.getSupabaseClient();
      const thirtyDaysAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString();
      const { count: recentCount } = await supabase
        .from('user_roles')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', delegatedContext.tenant_id)
        .gte('updated_at', thirtyDaysAgo);

      return {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.delegated_roles.length > 0).length,
        totalRoles: roles.length,
        delegatableRoles: roles.filter(r => r.is_delegatable).length,
        scopeCount: filteredScopes.length,
        recentChanges: recentCount ?? 0
      };
    } catch (error) {
      console.error('[DelegationAdapter] Error building delegation stats:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        totalRoles: 0,
        delegatableRoles: 0,
        scopeCount: 0,
        recentChanges: 0
      };
    }
  }

  async assignDelegatedRole(params: {
    delegatorId: string;
    delegateeId: string;
    roleId: string;
    scopeId?: string;
    context: DelegatedContext;
  }): Promise<{ success: boolean; assignment: any }> {
    const { delegatorId, delegateeId, roleId, scopeId, context } = params;

    try {
      const supabase = await this.getSupabaseClient();
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('user_roles')
        .upsert({
          tenant_id: context.tenant_id,
          user_id: delegateeId,
          role_id: roleId,
          assigned_by: delegatorId,
          assigned_at: now,
          is_active: true,
          updated_at: now
        }, { onConflict: 'tenant_id,user_id,role_id' })
        .select('id, tenant_id, user_id, role_id, assigned_at, assigned_by, is_active, expires_at, updated_at')
        .single();

      if (error) {
        throw new Error(`Failed to assign delegated role: ${error.message}`);
      }

      const assignment = {
        ...data,
        scope_id: scopeId ?? context.scope_id ?? null
      };

      return {
        success: true,
        assignment
      };
    } catch (error) {
      console.error('[DelegationAdapter] Error assigning delegated role:', error);
      throw error;
    }
  }

  async revokeDelegatedRole(params: {
    delegatorId: string;
    delegateeId: string;
    roleId: string;
    context: DelegatedContext;
  }): Promise<{ success: boolean }> {
    const { delegateeId, roleId, context } = params;

    try {
      const supabase = await this.getSupabaseClient();
      const { error } = await supabase
        .from('user_roles')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('tenant_id', context.tenant_id)
        .eq('user_id', delegateeId)
        .eq('role_id', roleId);

      if (error) {
        throw new Error(`Failed to revoke delegated role: ${error.message}`);
      }

      return { success: true };
    } catch (error) {
      console.error('[DelegationAdapter] Error revoking delegated role:', error);
      throw error;
    }
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
