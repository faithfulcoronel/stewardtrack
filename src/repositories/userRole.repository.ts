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

export interface IUserRoleManagementRepository extends BaseRepository<UserRole> {
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
    return await this.userRoleAdapter.getUserWithRoles(userId, tenantId);
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
}
