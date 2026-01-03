import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import type { IUserRoleManagementAdapter } from '@/adapters/userRoleManagement.adapter';
import type {
  UserRole,
  AssignRoleDto,
  Role,
  UserWithRoles
} from '@/models/rbac.model';
import { TYPES } from '@/lib/types';

/**
 * Unified User Role Management Repository
 * Consolidates all user role operations and RBAC permission checks
 * This is the single source of truth for user role operations
 */
export interface IUserRoleManagementRepository extends BaseRepository<UserRole> {
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
  // Note: getUserAccessibleMenuItems removed - menu/navigation is controlled via static metadata XML
  // Note: getUserAccessibleMetadataSurfaces removed - metadata access is controlled via
  // static XML files with featureCode and requiredPermissions attributes, not database
}

@injectable()
export class UserRoleManagementRepository extends BaseRepository<UserRole> implements IUserRoleManagementRepository {
  constructor(@inject(TYPES.IUserRoleManagementAdapter) private readonly userRoleAdapter: IUserRoleManagementAdapter) {
    super(userRoleAdapter);
  }

  async assignRole(data: AssignRoleDto, tenantId: string, assignedBy?: string): Promise<UserRole> {
    return await this.userRoleAdapter.assignRole(data, tenantId, assignedBy);
  }

  async revokeRole(userId: string, roleId: string, tenantId: string): Promise<void> {
    return await this.userRoleAdapter.revokeRole(userId, roleId, tenantId);
  }

  async getUserRoles(userId: string, tenantId: string): Promise<Role[]> {
    return await this.userRoleAdapter.getUserRoles(userId, tenantId);
  }

  async getUsersWithRole(roleId: string, tenantId: string): Promise<any[]> {
    return await this.userRoleAdapter.getUsersWithRole(roleId, tenantId);
  }

  async getUserWithRoles(userId: string, tenantId: string): Promise<UserWithRoles | null> {
    console.log(`[UserRoleRepository.getUserWithRoles] Calling adapter with userId=${userId}, tenantId=${tenantId}`);
    const result = await this.userRoleAdapter.getUserWithRoles(userId, tenantId);
    console.log(`[UserRoleRepository.getUserWithRoles] Adapter returned:`, result);
    return result;
  }

  async removeUserRole(userId: string, roleId: string, tenantId: string): Promise<any> {
    return await this.userRoleAdapter.removeUserRole(userId, roleId, tenantId);
  }

  async getMultiRoleUsers(tenantId: string): Promise<any[]> {
    return await this.userRoleAdapter.getMultiRoleUsers(tenantId);
  }

  async assignMultipleRoles(userId: string, roleIds: string[], tenantId: string): Promise<any> {
    return await this.userRoleAdapter.assignMultipleRoles(userId, roleIds, tenantId);
  }

  async toggleMultiRoleMode(userId: string, enabled: boolean, tenantId: string): Promise<any> {
    return await this.userRoleAdapter.toggleMultiRoleMode(userId, enabled, tenantId);
  }

  async getUserMultiRoleContext(userId: string, tenantId: string): Promise<any> {
    return await this.userRoleAdapter.getUserMultiRoleContext(userId, tenantId);
  }

  async getUsers(tenantId: string): Promise<any[]> {
    return await this.userRoleAdapter.getUsers(tenantId);
  }

  // ========================================
  // RBAC Permission Methods
  // ========================================

  async getRoleDetailsByUser(userId: string, tenantId?: string): Promise<{ role_id: string; role_name: string }[]> {
    return await this.userRoleAdapter.getRoleDetailsByUser(userId, tenantId);
  }

  async getAdminRole(userId: string, tenantId: string): Promise<string | null> {
    return await this.userRoleAdapter.getAdminRole(userId, tenantId);
  }

  async getRolesWithPermissions(userId: string, tenantId?: string): Promise<any[]> {
    return await this.userRoleAdapter.getRolesWithPermissions(userId, tenantId);
  }

  async isSuperAdmin(): Promise<boolean> {
    return await this.userRoleAdapter.isSuperAdmin();
  }

  async isAdmin(userId: string): Promise<boolean> {
    return await this.userRoleAdapter.isAdmin(userId);
  }

  async canUser(permission: string, tenantId?: string): Promise<boolean> {
    return await this.userRoleAdapter.canUser(permission, tenantId);
  }

  async canUserFast(permission: string, tenantId?: string): Promise<boolean> {
    return await this.userRoleAdapter.canUserFast(permission, tenantId);
  }

  async canUserAny(permissions: string[], tenantId?: string): Promise<boolean> {
    return await this.userRoleAdapter.canUserAny(permissions, tenantId);
  }

  async canUserAll(permissions: string[], tenantId?: string): Promise<boolean> {
    return await this.userRoleAdapter.canUserAll(permissions, tenantId);
  }

  async getUserEffectivePermissions(userId: string, tenantId?: string): Promise<any[]> {
    return await this.userRoleAdapter.getUserEffectivePermissions(userId, tenantId);
  }

  async getUserRoleMetadataKeys(userId: string, tenantId?: string): Promise<string[]> {
    return await this.userRoleAdapter.getUserRoleMetadataKeys(userId, tenantId);
  }

  async replaceUserRoles(userId: string, roleIds: string[], tenantId: string): Promise<void> {
    return await this.userRoleAdapter.replaceUserRoles(userId, roleIds, tenantId);
  }

  async getRolesByUser(userId: string, tenantId?: string): Promise<string[]> {
    return await this.userRoleAdapter.getRolesByUser(userId, tenantId);
  }

  async getUsersByRole(roleId: string): Promise<UserRole[]> {
    return await this.userRoleAdapter.getUsersByRole(roleId);
  }
}
