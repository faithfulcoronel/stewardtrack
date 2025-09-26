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

  async getUserPermissions(userId: string, tenantId?: string) {
    try {
      // Validate userId first
      if (!userId || typeof userId !== 'string') {
        console.warn('Invalid userId provided to getUserPermissions:', userId);
        return { roles: [], permissions: [], adminRole: null, metadataKeys: [] };
      }

      const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
      if (!effectiveTenantId) {
        return { roles: [], permissions: [], adminRole: null, metadataKeys: [] };
      }

      // Get admin role using the adapter directly with proper parameters
      let adminRole: string | null = null;
      try {
        adminRole = await (this.repo as any).adapter.getAdminRole(userId, effectiveTenantId);
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

      // Get user effective permissions (from materialized view)
      const effectivePermissions = await (this.repo as any).adapter.getUserEffectivePermissions(userId, effectiveTenantId);

      // Get user roles with permissions (for backward compatibility)
      const userRoles = await this.repo.getRolesWithPermissions(userId, effectiveTenantId);

      // Get metadata keys for role-based access in metadata system
      const metadataKeys = await (this.repo as any).adapter.getUserRoleMetadataKeys(userId, effectiveTenantId);

      // Transform effective permissions into unique permissions map
      const uniquePermissions = new Map<string, any>();
      effectivePermissions.forEach((perm: any) => {
        uniquePermissions.set(perm.permission_code, {
          code: perm.permission_code,
          name: perm.permission_name,
          module: perm.permission_module,
        });
      });

      return {
        roles: userRoles || [],
        permissions: Array.from(uniquePermissions.values()),
        effectivePermissions: effectivePermissions || [],
        adminRole,
        metadataKeys: metadataKeys || [],
      };
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      return { roles: [], permissions: [], adminRole: null, metadataKeys: [] };
    }
  }

  async canUser(permission: string, tenantId?: string): Promise<boolean> {
    try {
      const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
      return await (this.repo as any).adapter.canUserFast(permission, effectiveTenantId);
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  async canUserAny(permissions: string[], tenantId?: string): Promise<boolean> {
    try {
      const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
      return await (this.repo as any).adapter.canUserAny(permissions, effectiveTenantId);
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  }

  async canUserAll(permissions: string[], tenantId?: string): Promise<boolean> {
    try {
      const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
      return await (this.repo as any).adapter.canUserAll(permissions, effectiveTenantId);
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  }

  async getUserAccessibleMenuItems(userId: string, tenantId?: string): Promise<any[]> {
    try {
      const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
      return await (this.repo as any).adapter.getUserAccessibleMenuItems(userId, effectiveTenantId);
    } catch (error) {
      console.error('Error getting user accessible menu items:', error);
      return [];
    }
  }

  async getUserAccessibleMetadataSurfaces(userId: string, tenantId?: string): Promise<any[]> {
    try {
      const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
      return await (this.repo as any).adapter.getUserAccessibleMetadataSurfaces(userId, effectiveTenantId);
    } catch (error) {
      console.error('Error getting user accessible metadata surfaces:', error);
      return [];
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