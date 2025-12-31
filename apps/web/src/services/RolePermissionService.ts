import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IRolePermissionRepository } from '@/repositories/rolePermission.repository';
import type { IRoleRepository } from '@/repositories/role.repository';
import type { Permission } from '@/models/rbac.model';

/**
 * RolePermissionService
 *
 * Provides role permission management without exposing Supabase to API routes.
 */
@injectable()
export class RolePermissionService {
  constructor(
    @inject(TYPES.IRolePermissionRepository)
    private rolePermissionRepository: IRolePermissionRepository,
    @inject(TYPES.IRoleRepository)
    private roleRepository: IRoleRepository
  ) {}

  /**
   * Returns permissions assigned to a role for the provided tenant.
   */
  async getRolePermissions(roleId: string, tenantId: string): Promise<Permission[]> {
    const role = await this.roleRepository.getRoleWithPermissions(roleId, tenantId);
    if (!role) {
      throw new Error('Role not found or access denied');
    }

    return role.permissions;
  }

  /**
   * Replace all permissions for a role.
   */
  async replaceRolePermissions(roleId: string, permissionIds: string[], tenantId: string) {
    const role = await this.roleRepository.getRoleWithPermissions(roleId, tenantId);
    if (!role) {
      throw new Error('Role not found or access denied');
    }

    if (role.is_system) {
      throw new Error('Cannot modify permissions for system roles');
    }

    const existingPermissionIds = (role.permissions || []).map(p => p.id);

    if (existingPermissionIds.length) {
      await this.rolePermissionRepository.revokeMany(roleId, existingPermissionIds);
    }

    if (permissionIds.length) {
      await this.rolePermissionRepository.assignMany(roleId, permissionIds);
    }

    return {
      role_id: roleId,
      permission_count: permissionIds.length,
    };
  }

  /**
   * Add permissions to a role without removing existing ones.
   */
  async addPermissions(roleId: string, permissionIds: string[], tenantId: string) {
    const role = await this.roleRepository.getRoleWithPermissions(roleId, tenantId);
    if (!role) {
      throw new Error('Role not found or access denied');
    }

    if (role.is_system) {
      throw new Error('Cannot modify permissions for system roles');
    }

    if (permissionIds.length) {
      await this.rolePermissionRepository.assignMany(roleId, permissionIds);
    }

    return {
      role_id: roleId,
      added_count: permissionIds.length,
    };
  }

  /**
   * Remove specific permissions from a role.
   */
  async removePermissions(roleId: string, permissionIds: string[], tenantId: string) {
    const role = await this.roleRepository.getRoleWithPermissions(roleId, tenantId);
    if (!role) {
      throw new Error('Role not found or access denied');
    }

    if (role.is_system) {
      throw new Error('Cannot modify permissions for system roles');
    }

    if (permissionIds.length) {
      await this.rolePermissionRepository.revokeMany(roleId, permissionIds);
    }

    return {
      role_id: roleId,
      removed_count: permissionIds.length,
    };
  }
}
