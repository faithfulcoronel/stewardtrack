/**
 * Role Permission Adapter
 *
 * Handles database operations for the role_permissions join table
 * Manages the many-to-many relationship between roles and permissions
 */

import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { AuditService } from '@/services/AuditService';
import type { RolePermission } from '@/models/rbac.model';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseServiceClient } from '@/lib/supabase/service';

export interface IRolePermissionAdapter {
  assign(roleId: string, permissionId: string): Promise<RolePermission>;
  revoke(roleId: string, permissionId: string): Promise<void>;
  findByRoleAndPermission(roleId: string, permissionId: string): Promise<RolePermission | null>;
  getPermissionsByRole(roleId: string): Promise<RolePermission[]>;
  getRolesByPermission(permissionId: string): Promise<RolePermission[]>;
  assignMany(roleId: string, permissionIds: string[]): Promise<RolePermission[]>;
  revokeMany(roleId: string, permissionIds: string[]): Promise<void>;
  /** Assign permission with elevated access (bypasses RLS) for super admin operations */
  assignWithElevatedAccess(roleId: string, permissionId: string, tenantId: string): Promise<RolePermission>;
  /** Find by role and permission with elevated access (bypasses RLS) */
  findByRoleAndPermissionWithElevatedAccess(roleId: string, permissionId: string): Promise<RolePermission | null>;
  /** Batch assign permissions to a role with elevated access using upsert (bypasses RLS) */
  batchAssignWithElevatedAccess(
    assignments: Array<{ roleId: string; permissionId: string; tenantId: string }>
  ): Promise<{ inserted: number; skipped: number }>;
}

@injectable()
export class RolePermissionAdapter implements IRolePermissionAdapter {
  protected tableName = 'role_permissions';

  constructor(
    @inject(TYPES.AuditService) private auditService: AuditService
  ) {}

  /**
   * Assign a permission to a role
   */
  async assign(roleId: string, permissionId: string): Promise<RolePermission> {
    const supabase = await createSupabaseServerClient();

    // Check if already assigned
    const existing = await this.findByRoleAndPermission(roleId, permissionId);
    if (existing) {
      return existing;
    }

    // Get tenant_id from the role
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('tenant_id')
      .eq('id', roleId)
      .single();

    if (roleError || !role) {
      throw new Error(`Failed to get role tenant_id: ${roleError?.message || 'Role not found'}`);
    }

    const { data, error } = await supabase
      .from(this.tableName)
      .insert({
        tenant_id: role.tenant_id,
        role_id: roleId,
        permission_id: permissionId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to assign permission to role: ${error.message}`);
    }

    return data as RolePermission;
  }

  /**
   * Revoke a permission from a role
   */
  async revoke(roleId: string, permissionId: string): Promise<void> {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('role_id', roleId)
      .eq('permission_id', permissionId);

    if (error) {
      throw new Error(`Failed to revoke permission from role: ${error.message}`);
    }
  }

  /**
   * Check if a role has a specific permission
   */
  async findByRoleAndPermission(
    roleId: string,
    permissionId: string
  ): Promise<RolePermission | null> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('role_id', roleId)
      .eq('permission_id', permissionId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find role permission: ${error.message}`);
    }

    return data as RolePermission | null;
  }

  /**
   * Get all permissions for a role
   */
  async getPermissionsByRole(roleId: string): Promise<RolePermission[]> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('role_id', roleId);

    if (error) {
      throw new Error(`Failed to get permissions for role: ${error.message}`);
    }

    return data as RolePermission[];
  }

  /**
   * Get all roles that have a specific permission
   */
  async getRolesByPermission(permissionId: string): Promise<RolePermission[]> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('permission_id', permissionId);

    if (error) {
      throw new Error(`Failed to get roles for permission: ${error.message}`);
    }

    return data as RolePermission[];
  }

  /**
   * Bulk assign permissions to a role
   */
  async assignMany(roleId: string, permissionIds: string[]): Promise<RolePermission[]> {
    const supabase = await createSupabaseServerClient();

    // Get existing assignments
    const existing = await this.getPermissionsByRole(roleId);
    const existingPermissionIds = new Set(existing.map((rp) => rp.permission_id));

    // Filter out already assigned permissions
    const newPermissionIds = permissionIds.filter((id) => !existingPermissionIds.has(id));

    if (newPermissionIds.length === 0) {
      return existing;
    }

    // Get tenant_id from the role
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('tenant_id')
      .eq('id', roleId)
      .single();

    if (roleError || !role) {
      throw new Error(`Failed to get role tenant_id: ${roleError?.message || 'Role not found'}`);
    }

    const insertData = newPermissionIds.map((permissionId) => ({
      tenant_id: role.tenant_id,
      role_id: roleId,
      permission_id: permissionId,
    }));

    const { data, error } = await supabase
      .from(this.tableName)
      .insert(insertData)
      .select();

    if (error) {
      throw new Error(`Failed to bulk assign permissions: ${error.message}`);
    }

    return [...existing, ...(data as RolePermission[])];
  }

  /**
   * Bulk revoke permissions from a role
   */
  async revokeMany(roleId: string, permissionIds: string[]): Promise<void> {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('role_id', roleId)
      .in('permission_id', permissionIds);

    if (error) {
      throw new Error(`Failed to bulk revoke permissions: ${error.message}`);
    }
  }

  /**
   * Assign permission with elevated access (bypasses RLS) for super admin operations.
   * This allows assigning permissions to roles in any tenant.
   */
  async assignWithElevatedAccess(roleId: string, permissionId: string, tenantId: string): Promise<RolePermission> {
    const supabase = await getSupabaseServiceClient();

    // Check if already assigned
    const existing = await this.findByRoleAndPermissionWithElevatedAccess(roleId, permissionId);
    if (existing) {
      return existing;
    }

    const { data, error } = await supabase
      .from(this.tableName)
      .insert({
        tenant_id: tenantId,
        role_id: roleId,
        permission_id: permissionId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to assign permission with elevated access: ${error.message}`);
    }

    return data as RolePermission;
  }

  /**
   * Find by role and permission with elevated access (bypasses RLS).
   */
  async findByRoleAndPermissionWithElevatedAccess(
    roleId: string,
    permissionId: string
  ): Promise<RolePermission | null> {
    const supabase = await getSupabaseServiceClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('role_id', roleId)
      .eq('permission_id', permissionId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find role permission with elevated access: ${error.message}`);
    }

    return data as RolePermission | null;
  }

  /**
   * Batch assign permissions to roles with elevated access using upsert.
   * This significantly reduces database round-trips by:
   * 1. Using upsert (INSERT ... ON CONFLICT DO NOTHING) to avoid check-then-insert race conditions
   * 2. Batching multiple assignments into a single query
   *
   * @param assignments Array of role-permission assignments to create
   * @returns Count of inserted and skipped assignments
   */
  async batchAssignWithElevatedAccess(
    assignments: Array<{ roleId: string; permissionId: string; tenantId: string }>
  ): Promise<{ inserted: number; skipped: number }> {
    if (assignments.length === 0) {
      return { inserted: 0, skipped: 0 };
    }

    const supabase = await getSupabaseServiceClient();

    // Prepare data for upsert
    const insertData = assignments.map(a => ({
      tenant_id: a.tenantId,
      role_id: a.roleId,
      permission_id: a.permissionId,
    }));

    // Use upsert with onConflict to skip existing records
    // The role_permissions table has a unique constraint on (tenant_id, role_id, permission_id)
    const { data, error } = await supabase
      .from(this.tableName)
      .upsert(insertData, {
        onConflict: 'tenant_id,role_id,permission_id',
        ignoreDuplicates: true,
      })
      .select();

    if (error) {
      throw new Error(`Failed to batch assign permissions with elevated access: ${error.message}`);
    }

    const inserted = data?.length ?? 0;
    const skipped = assignments.length - inserted;

    return { inserted, skipped };
  }
}
