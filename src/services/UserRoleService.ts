import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IUserRoleRepository } from '@/repositories/userRole.repository';
import type { IRoleRepository } from '@/repositories/role.repository';
import { tenantUtils } from '@/utils/tenantUtils';

@injectable()
export class UserRoleService {
  constructor(
    @inject(TYPES.IUserRoleRepository)
    private repo: IUserRoleRepository,
    @inject(TYPES.IRoleRepository)
    private roleRepo: IRoleRepository,
  ) {}

  async assignRoles(userId: string, roleIds: string[]): Promise<void> {
    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) throw new Error('No tenant context found');

    if (roleIds.length) {
      const { data: roles } = await this.roleRepo.find({
        filters: {
          id: { operator: 'isAnyOf', value: roleIds },
          tenant_id: { operator: 'eq', value: tenantId },
        },
      });
      const found = roles.map(r => r.id);
      if (found.length !== roleIds.length) {
        throw new Error('Invalid role ids');
      }
    }

    await this.repo.replaceUserRoles(userId, roleIds);
  }

  async getUserPermissions(userId: string) {
    try {
      // Validate userId first
      if (!userId || typeof userId !== 'string') {
        console.warn('Invalid userId provided to getUserPermissions:', userId);
        return { roles: [], permissions: [], adminRole: null };
      }

      const tenantId = await tenantUtils.getTenantId();
      if (!tenantId) {
        return { roles: [], permissions: [], adminRole: null };
      }

      // Get admin role using the adapter directly with proper parameters
      let adminRole: string | null = null;
      try {
        adminRole = await (this.repo as any).adapter.getAdminRole(userId, tenantId);
      } catch (error) {
        console.warn('Error getting admin role:', error);
      }

      // Check if user is super admin
      if (!adminRole) {
        try {
          const isSuper = await this.repo.isSuperAdmin(userId);
          if (isSuper) {
            adminRole = 'super_admin';
          }
        } catch (error) {
          console.warn('Error checking super admin status:', error);
        }
      }

      // Get user roles with permissions
      const userRoles = await this.repo.getRolesWithPermissions(userId);
      const uniquePermissions = new Map<string, any>();
      userRoles.forEach((role: any) => {
        const perms = role.permissions || [];
        perms.forEach((p: any) => {
          uniquePermissions.set(p.code, p);
        });
      });

      return {
        roles: userRoles || [],
        permissions: Array.from(uniquePermissions.values()),
        adminRole,
      };
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      return { roles: [], permissions: [], adminRole: null };
    }
  }

  async canUser(permission: string): Promise<boolean> {
    try {
      return await (this.repo as any).adapter.canUser(permission);
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  async isSuperAdmin(userId?: string): Promise<boolean> {
    try {
      if (userId) {
        return await this.repo.isSuperAdmin(userId);
      } else {
        return await (this.repo as any).adapter.isSuperAdmin();
      }
    } catch (error) {
      console.error('Error checking super admin:', error);
      return false;
    }
  }
}