/**
 * Role Permission Repository
 *
 * Manages the many-to-many relationship between roles and permissions
 * Handles permission assignments to roles
 */

import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import type { IRolePermissionAdapter } from '@/adapters/rolePermission.adapter';
import type { RolePermission } from '@/models/rbac.model';
import { TYPES } from '@/lib/types';

export interface IRolePermissionRepository {
  /**
   * Assign a permission to a role
   */
  assign(roleId: string, permissionId: string): Promise<RolePermission>;

  /**
   * Revoke a permission from a role
   */
  revoke(roleId: string, permissionId: string): Promise<void>;

  /**
   * Check if a role has a specific permission
   */
  findByRoleAndPermission(roleId: string, permissionId: string): Promise<RolePermission | null>;

  /**
   * Get all permissions for a role
   */
  getPermissionsByRole(roleId: string): Promise<RolePermission[]>;

  /**
   * Get all roles that have a specific permission
   */
  getRolesByPermission(permissionId: string): Promise<RolePermission[]>;

  /**
   * Bulk assign permissions to a role
   */
  assignMany(roleId: string, permissionIds: string[]): Promise<RolePermission[]>;

  /**
   * Bulk revoke permissions from a role
   */
  revokeMany(roleId: string, permissionIds: string[]): Promise<void>;

  /**
   * Assign permission with elevated access (bypasses RLS) - FOR SUPER ADMIN USE ONLY
   */
  assignWithElevatedAccess(roleId: string, permissionId: string, tenantId: string): Promise<RolePermission>;

  /**
   * Find by role and permission with elevated access (bypasses RLS) - FOR SUPER ADMIN USE ONLY
   */
  findByRoleAndPermissionWithElevatedAccess(roleId: string, permissionId: string): Promise<RolePermission | null>;

  /**
   * Batch assign permissions to roles with elevated access using upsert (bypasses RLS).
   * FOR SUPER ADMIN USE ONLY - Used during registration to efficiently assign all permissions.
   */
  batchAssignWithElevatedAccess(
    assignments: Array<{ roleId: string; permissionId: string; tenantId: string }>
  ): Promise<{ inserted: number; skipped: number }>;
}

@injectable()
export class RolePermissionRepository implements IRolePermissionRepository {
  constructor(
    @inject(TYPES.IRolePermissionAdapter)
    private readonly rolePermissionAdapter: IRolePermissionAdapter
  ) {}

  async assign(roleId: string, permissionId: string): Promise<RolePermission> {
    return await this.rolePermissionAdapter.assign(roleId, permissionId);
  }

  async revoke(roleId: string, permissionId: string): Promise<void> {
    return await this.rolePermissionAdapter.revoke(roleId, permissionId);
  }

  async findByRoleAndPermission(
    roleId: string,
    permissionId: string
  ): Promise<RolePermission | null> {
    return await this.rolePermissionAdapter.findByRoleAndPermission(roleId, permissionId);
  }

  async getPermissionsByRole(roleId: string): Promise<RolePermission[]> {
    return await this.rolePermissionAdapter.getPermissionsByRole(roleId);
  }

  async getRolesByPermission(permissionId: string): Promise<RolePermission[]> {
    return await this.rolePermissionAdapter.getRolesByPermission(permissionId);
  }

  async assignMany(roleId: string, permissionIds: string[]): Promise<RolePermission[]> {
    return await this.rolePermissionAdapter.assignMany(roleId, permissionIds);
  }

  async revokeMany(roleId: string, permissionIds: string[]): Promise<void> {
    return await this.rolePermissionAdapter.revokeMany(roleId, permissionIds);
  }

  /**
   * Assign permission with elevated access (bypasses RLS).
   * FOR SUPER ADMIN USE ONLY - Used during license assignment to assign permissions to tenant roles.
   */
  async assignWithElevatedAccess(roleId: string, permissionId: string, tenantId: string): Promise<RolePermission> {
    return await this.rolePermissionAdapter.assignWithElevatedAccess(roleId, permissionId, tenantId);
  }

  /**
   * Find by role and permission with elevated access (bypasses RLS).
   * FOR SUPER ADMIN USE ONLY - Used during license assignment to check existing role permissions.
   */
  async findByRoleAndPermissionWithElevatedAccess(roleId: string, permissionId: string): Promise<RolePermission | null> {
    return await this.rolePermissionAdapter.findByRoleAndPermissionWithElevatedAccess(roleId, permissionId);
  }

  /**
   * Batch assign permissions to roles with elevated access using upsert (bypasses RLS).
   * FOR SUPER ADMIN USE ONLY - Used during registration to efficiently assign all permissions.
   * Uses upsert to avoid check-then-insert race conditions and reduces database round-trips.
   */
  async batchAssignWithElevatedAccess(
    assignments: Array<{ roleId: string; permissionId: string; tenantId: string }>
  ): Promise<{ inserted: number; skipped: number }> {
    return await this.rolePermissionAdapter.batchAssignWithElevatedAccess(assignments);
  }
}
