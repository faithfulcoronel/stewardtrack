import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IUserRoleManagementRepository } from '@/repositories/userRole.repository';
import type { IRoleRepository } from '@/repositories/role.repository';
import type { LicensingService } from '@/services/LicensingService';
import { tenantUtils } from '@/utils/tenantUtils';
import { checkSuperAdmin as checkSuperAdminHelper } from '@/lib/rbac/permissionHelpers';

/**
 * UserRoleService - Unified service for user role management and RBAC permission checks
 * Now uses IUserRoleManagementRepository as the single source of truth for all user role operations
 * All methods respect RBAC configuration from the database
 */
@injectable()
export class UserRoleService {
  constructor(
    @inject(TYPES.IUserRoleManagementRepository)
    private repo: IUserRoleManagementRepository,
    @inject(TYPES.IRoleRepository)
    private roleRepo: IRoleRepository,
    @inject(TYPES.LicensingService)
    private licensingService: LicensingService,
  ) {}

  /**
   * Assign roles to a user, replacing any existing role assignments
   * Validates that all role IDs exist and belong to the current tenant before assignment
   * Uses RBAC-compliant repository method
   */
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

    // Use the repository method which respects RBAC configuration
    await this.repo.replaceUserRoles(userId, roleIds, tenantId);
  }

  /**
   * Get comprehensive user permissions including roles, effective permissions, admin role, and metadata keys
   * All data is fetched through RBAC-compliant repository methods
   */
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

      // Get admin role using repository method
      let adminRole: string | null = null;
      try {
        adminRole = await this.repo.getAdminRole(userId, effectiveTenantId);
      } catch (error) {
        console.warn('Error getting admin role:', error);
      }

      // Check if user is super admin
      if (!adminRole) {
        try {
          const isSuper = await this.repo.isSuperAdmin();
          if (isSuper) {
            adminRole = 'super_admin';
          }
        } catch (error) {
          console.warn('Error checking super admin status:', error);
        }
      }

      // Get user effective permissions (from materialized view via RPC)
      const effectivePermissions = await this.repo.getUserEffectivePermissions(userId, effectiveTenantId);

      // Get user roles with permissions (for backward compatibility)
      const userRoles = await this.repo.getRolesWithPermissions(userId, effectiveTenantId);

      // Get metadata keys for role-based access in metadata system
      const metadataKeys = await this.repo.getUserRoleMetadataKeys(userId, effectiveTenantId);

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

  /**
   * Check if current user has a specific permission
   * Uses RBAC configuration from database via repository
   */
  async canUser(permission: string, tenantId?: string): Promise<boolean> {
    try {
      const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
      return await this.repo.canUserFast(permission, effectiveTenantId);
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Check if current user has any of the specified permissions
   * Uses RBAC configuration from database via repository
   */
  async canUserAny(permissions: string[], tenantId?: string): Promise<boolean> {
    try {
      const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
      return await this.repo.canUserAny(permissions, effectiveTenantId);
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  }

  /**
   * Check if current user has all of the specified permissions
   * Uses RBAC configuration from database via repository
   */
  async canUserAll(permissions: string[], tenantId?: string): Promise<boolean> {
    try {
      const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
      return await this.repo.canUserAll(permissions, effectiveTenantId);
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  }

  /**
   * Get menu items accessible to user based on RBAC permissions
   * Uses RBAC configuration from database via repository
   */
  async getUserAccessibleMenuItems(userId: string, tenantId?: string): Promise<any[]> {
    try {
      const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
      return await this.repo.getUserAccessibleMenuItems(userId, effectiveTenantId);
    } catch (error) {
      console.error('Error getting user accessible menu items:', error);
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