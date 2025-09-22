import { injectable, inject } from 'inversify';
import { BaseRepository } from './base.repository';
import { UserRole } from '../models/userRole.model';
import type { IUserRoleAdapter } from '../adapters/userRole.adapter';
import { TYPES } from '../lib/types';
import { handleError } from '../utils/errorHandler';

export interface IUserRoleRepository extends BaseRepository<UserRole> {
  replaceUserRoles(
    userId: string,
    roleIds: string[],
    tenantId?: string,
  ): Promise<void>;
  getRoleDetailsByUser(userId: string): Promise<{ role_id: string; role_name: string }[]>;
  getAdminRole(userId: string, tenantId: string): Promise<string | null>;
  getRolesWithPermissions(userId: string): Promise<UserRole[]>;
  isSuperAdmin(userId?: string): Promise<boolean>;
  isAdmin(userId: string): Promise<boolean>;
  getUsersByRole(roleId: string): Promise<UserRole[]>;
}

@injectable()
export class UserRoleRepository
  extends BaseRepository<UserRole>
  implements IUserRoleRepository
{
  constructor(
    @inject(TYPES.IUserRoleAdapter)
    private userRoleAdapter: IUserRoleAdapter,
  ) {
    super(userRoleAdapter as any);
  }

  async replaceUserRoles(
    userId: string,
    roleIds: string[],
    tenantId?: string,
  ): Promise<void> {
    try {
      // Validate userId
      if (!userId || typeof userId !== 'string') {
        throw new Error('Invalid userId provided');
      }

      await (this.adapter as unknown as IUserRoleAdapter).replaceUserRoles(
        userId,
        roleIds,
        tenantId || '',
      );
    } catch (error) {
      throw handleError(error, {
        context: 'replaceUserRoles',
        userId,
        roleIds,
        tenantId,
      });
    }
  }

  async getRoleDetailsByUser(userId: string): Promise<{ role_id: string; role_name: string }[]> {
    try {
      // Validate userId
      if (!userId || typeof userId !== 'string') {
        throw new Error('Invalid userId provided');
      }

      return await (this.adapter as unknown as IUserRoleAdapter).getRoleDetailsByUser(userId);
    } catch (error) {
      throw handleError(error, {
        context: 'getRoleDetailsByUser',
        userId,
      });
    }
  }

  async getAdminRole(userId: string, tenantId: string): Promise<string | null> {
    try {
      // Validate parameters
      if (!userId || typeof userId !== 'string') {
        throw new Error('Invalid userId provided');
      }
      if (!tenantId || typeof tenantId !== 'string') {
        throw new Error('Invalid tenantId provided');
      }

      return await (this.adapter as unknown as IUserRoleAdapter).getAdminRole(userId, tenantId);
    } catch (error) {
      throw handleError(error, {
        context: 'getAdminRole',
        userId,
        tenantId,
      });
    }
  }

  async getRolesWithPermissions(userId: string): Promise<UserRole[]> {
    try {
      // Validate userId
      if (!userId || typeof userId !== 'string') {
        throw new Error('Invalid userId provided');
      }

      const result = await (this.adapter as unknown as IUserRoleAdapter).getRolesWithPermissions(userId);
      // Convert the result to UserRole[] format
      return result as UserRole[];
    } catch (error) {
      throw handleError(error, {
        context: 'getRolesWithPermissions',
        userId,
      });
    }
  }

  async isSuperAdmin(userId?: string): Promise<boolean> {
    try {
      // If userId is provided, validate it
      if (userId !== undefined && (!userId || typeof userId !== 'string')) {
        throw new Error('Invalid userId provided');
      }

      return await (this.adapter as unknown as IUserRoleAdapter).isSuperAdmin();
    } catch (error) {
      throw handleError(error, {
        context: 'isSuperAdmin',
        userId,
      });
    }
  }

  async isAdmin(userId: string): Promise<boolean> {
    try {
      // Validate userId
      if (!userId || typeof userId !== 'string') {
        throw new Error('Invalid userId provided');
      }

      return await (this.adapter as unknown as IUserRoleAdapter).isAdmin(userId);
    } catch (error) {
      throw handleError(error, {
        context: 'isAdmin',
        userId,
      });
    }
  }

  async getUsersByRole(roleId: string): Promise<UserRole[]> {
    try {
      // Validate roleId
      if (!roleId || typeof roleId !== 'string') {
        throw new Error('Invalid roleId provided');
      }

      return await (this.adapter as unknown as IUserRoleAdapter).getUsersByRole(roleId);
    } catch (error) {
      throw handleError(error, {
        context: 'getUsersByRole',
        roleId,
      });
    }
  }
}