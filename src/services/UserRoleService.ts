import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IUserRoleRepository } from '@/repositories/userRole.repository';
import type { IRoleRepository } from '@/repositories/role.repository';
import type { LicensingService } from '@/services/LicensingService';
import { tenantUtils } from '@/utils/tenantUtils';
import { checkSuperAdmin as checkSuperAdminHelper } from '@/lib/rbac/permissionHelpers';

@injectable()
export class UserRoleService {
  constructor(
    @inject(TYPES.IUserRoleRepository)
    private repo: IUserRoleRepository,
    @inject(TYPES.IRoleRepository)
    private roleRepo: IRoleRepository,
    @inject(TYPES.LicensingService)
    private licensingService: LicensingService,
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

  /**
   * Check if current user is a super admin
   * Uses the centralized permissionHelpers.checkSuperAdmin() method
   * which calls get_user_admin_role RPC
   *
   * @deprecated userId parameter is ignored. Use permissionHelpers.checkSuperAdmin() directly
   */
  async isSuperAdmin(_userId?: string): Promise<boolean> {
    try {
      // Use centralized helper that calls get_user_admin_role RPC
      return await checkSuperAdminHelper();
    } catch (error) {
      console.error('Error checking super admin:', error);
      return false;
    }
  }

  /**
   * Checks if a user can access a surface based on BOTH RBAC permissions AND license state
   * This is the primary method for enforcing combined permission + licensing checks
   *
   * @param userId - User ID to check access for
   * @param surfaceId - Surface/metadata ID to check
   * @param tenantId - Optional tenant ID (defaults to current tenant)
   * @returns Promise<boolean> - True if user has both RBAC permission AND license access
   */
  async canAccessSurfaceWithLicense(userId: string, surfaceId: string, tenantId?: string): Promise<boolean> {
    try {
      const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
      if (!effectiveTenantId) {
        console.warn('No tenant context for surface access check');
        return false;
      }

      // First check RBAC permission via metadata surfaces
      const accessibleSurfaces = await this.getUserAccessibleMetadataSurfaces(userId, effectiveTenantId);
      const hasRbacPermission = accessibleSurfaces.some((surface: any) => surface.id === surfaceId);

      if (!hasRbacPermission) {
        return false;
      }

      // Then check licensing
      const licenseResult = await this.licensingService.checkSurfaceAccess(userId, surfaceId, effectiveTenantId);
      return licenseResult.hasAccess;
    } catch (error) {
      console.error('Error checking surface access with license:', error);
      return false;
    }
  }

  /**
   * Gets all surfaces that a user can access based on RBAC + licensing
   * Returns only the surface IDs that pass both checks
   *
   * @param userId - User ID to get accessible surfaces for
   * @param tenantId - Optional tenant ID (defaults to current tenant)
   * @returns Promise<string[]> - Array of accessible surface IDs
   */
  async getUserAccessibleSurfaces(userId: string, tenantId?: string): Promise<string[]> {
    try {
      const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
      if (!effectiveTenantId) {
        return [];
      }

      // Get RBAC-accessible surfaces
      const rbacSurfaces = await this.getUserAccessibleMetadataSurfaces(userId, effectiveTenantId);
      const rbacSurfaceIds = rbacSurfaces.map((surface: any) => surface.id);

      // Get license-accessible surfaces
      const licensedSurfaces = await this.licensingService.getTenantLicensedSurfaces(effectiveTenantId);

      // Return intersection of both sets (surfaces that have both RBAC and license)
      return rbacSurfaceIds.filter(surfaceId => licensedSurfaces.includes(surfaceId));
    } catch (error) {
      console.error('Error getting user accessible surfaces:', error);
      return [];
    }
  }

  /**
   * Gets surfaces that user has RBAC permission for but are locked due to licensing
   * Useful for showing "upgrade to unlock" UI elements
   *
   * @param userId - User ID to check
   * @param tenantId - Optional tenant ID (defaults to current tenant)
   * @returns Promise<string[]> - Array of surface IDs locked by licensing
   */
  async getLockedSurfaces(userId: string, tenantId?: string): Promise<string[]> {
    try {
      const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
      if (!effectiveTenantId) {
        return [];
      }

      // Get RBAC-accessible surfaces
      const rbacSurfaces = await this.getUserAccessibleMetadataSurfaces(userId, effectiveTenantId);
      const rbacSurfaceIds = rbacSurfaces.map((surface: any) => surface.id);

      // Get license-accessible surfaces
      const licensedSurfaces = await this.licensingService.getTenantLicensedSurfaces(effectiveTenantId);

      // Return surfaces that have RBAC but NOT license
      return rbacSurfaceIds.filter(surfaceId => !licensedSurfaces.includes(surfaceId));
    } catch (error) {
      console.error('Error getting locked surfaces:', error);
      return [];
    }
  }

  /**
   * Gets user roles as role codes (for metadata evaluation context)
   *
   * @param userId - User ID to get roles for
   * @param tenantId - Optional tenant ID (defaults to current tenant)
   * @returns Promise<string[]> - Array of role codes
   */
  async getUserRoleCodes(userId: string, tenantId?: string): Promise<string[]> {
    try {
      const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
      if (!effectiveTenantId) {
        return [];
      }

      const userRoles = await this.repo.getRolesWithPermissions(userId, effectiveTenantId);
      return userRoles.map((role: any) => role.code);
    } catch (error) {
      console.error('Error getting user role codes:', error);
      return [];
    }
  }
}