/**
 * Permission Helper Utilities
 *
 * Provides convenient helper functions for checking RBAC + licensing permissions
 * throughout the application. These helpers use the DI container to resolve
 * services and provide a simplified API for common permission checks.
 */

import 'server-only';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { UserRoleService } from '@/services/UserRoleService';
import type { LicensingService } from '@/services/LicensingService';
import { tenantUtils } from '@/utils/tenantUtils';

/**
 * Checks if a user can access a specific surface based on RBAC + licensing
 *
 * @param userId - User ID to check access for
 * @param surfaceId - Surface/metadata ID to check
 * @param tenantId - Optional tenant ID (defaults to current tenant)
 * @returns Promise<boolean> - True if user has both RBAC and license access
 *
 * @example
 * const canAccess = await checkSurfaceAccess(userId, 'member-management', tenantId);
 * if (!canAccess) {
 *   throw new Error('Access denied');
 * }
 */
export async function checkSurfaceAccess(
  userId: string,
  surfaceId: string,
  tenantId?: string
): Promise<boolean> {
  const userRoleService = container.get<UserRoleService>(TYPES.UserRoleService);
  return await userRoleService.canAccessSurfaceWithLicense(userId, surfaceId, tenantId);
}

/**
 * Gets all surfaces accessible to a user (RBAC + licensing intersection)
 *
 * @param userId - User ID to get accessible surfaces for
 * @param tenantId - Optional tenant ID (defaults to current tenant)
 * @returns Promise<string[]> - Array of accessible surface IDs
 *
 * @example
 * const surfaces = await getUserSurfaces(userId);
 * console.log('User can access:', surfaces);
 */
export async function getUserSurfaces(
  userId: string,
  tenantId?: string
): Promise<string[]> {
  const userRoleService = container.get<UserRoleService>(TYPES.UserRoleService);
  return await userRoleService.getUserAccessibleSurfaces(userId, tenantId);
}

/**
 * Gets surfaces that user has RBAC permission for but are locked due to licensing
 * Useful for showing "upgrade to unlock" UI elements
 *
 * @param userId - User ID to check
 * @param tenantId - Optional tenant ID (defaults to current tenant)
 * @returns Promise<string[]> - Array of surface IDs locked by licensing
 *
 * @example
 * const lockedSurfaces = await getLockedSurfaces(userId);
 * if (lockedSurfaces.length > 0) {
 *   showUpgradePrompt();
 * }
 */
export async function getLockedSurfaces(
  userId: string,
  tenantId?: string
): Promise<string[]> {
  const userRoleService = container.get<UserRoleService>(TYPES.UserRoleService);
  return await userRoleService.getLockedSurfaces(userId, tenantId);
}

/**
 * Gets detailed surface access information including lock status
 *
 * @param userId - User ID to check
 * @param surfaceId - Surface ID to check
 * @param tenantId - Optional tenant ID (defaults to current tenant)
 * @returns Promise<SurfaceAccessInfo> - Detailed access information
 *
 * @example
 * const info = await getSurfaceAccessInfo(userId, 'advanced-reports');
 * if (info.locked) {
 *   showLockIcon(info.lockReason);
 * }
 */
export async function getSurfaceAccessInfo(
  userId: string,
  surfaceId: string,
  tenantId?: string
): Promise<{
  hasAccess: boolean;
  hasRbac: boolean;
  hasLicense: boolean;
  locked: boolean;
  lockReason?: string;
}> {
  const userRoleService = container.get<UserRoleService>(TYPES.UserRoleService);
  const licensingService = container.get<LicensingService>(TYPES.LicensingService);

  const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
  if (!effectiveTenantId) {
    return {
      hasAccess: false,
      hasRbac: false,
      hasLicense: false,
      locked: true,
      lockReason: 'No tenant context',
    };
  }

  // Check RBAC
  const rbacSurfaces = await userRoleService.getUserAccessibleMetadataSurfaces(userId, effectiveTenantId);
  const hasRbac = rbacSurfaces.some((surface: any) => surface.id === surfaceId);

  // Check licensing
  const licenseResult = await licensingService.checkSurfaceAccess(userId, surfaceId, effectiveTenantId);
  const hasLicense = licenseResult.hasAccess;

  const hasAccess = hasRbac && hasLicense;
  const locked = hasRbac && !hasLicense;

  return {
    hasAccess,
    hasRbac,
    hasLicense,
    locked,
    lockReason: locked ? 'Requires license upgrade' : undefined,
  };
}

/**
 * Gets tenant's licensed surfaces (all surfaces available under current license)
 *
 * @param tenantId - Optional tenant ID (defaults to current tenant)
 * @returns Promise<string[]> - Array of licensed surface IDs
 *
 * @example
 * const licensedSurfaces = await getTenantLicensedSurfaces();
 * console.log('Tenant license includes:', licensedSurfaces);
 */
export async function getTenantLicensedSurfaces(tenantId?: string): Promise<string[]> {
  const licensingService = container.get<LicensingService>(TYPES.LicensingService);
  const effectiveTenantId = tenantId || await tenantUtils.getTenantId();

  if (!effectiveTenantId) {
    return [];
  }

  return await licensingService.getTenantLicensedSurfaces(effectiveTenantId);
}

/**
 * Checks if a user has a specific RBAC permission (without licensing check)
 * Use this for non-surface-specific permission checks
 *
 * @param userId - User ID to check
 * @param permission - Permission code to check
 * @param tenantId - Optional tenant ID (defaults to current tenant)
 * @returns Promise<boolean> - True if user has the permission
 *
 * @example
 * const canEdit = await hasPermission(userId, 'member.edit');
 * if (!canEdit) {
 *   disableEditButton();
 * }
 */
export async function hasPermission(
  userId: string,
  permission: string,
  tenantId?: string
): Promise<boolean> {
  const userRoleService = container.get<UserRoleService>(TYPES.UserRoleService);
  return await userRoleService.canUser(permission, tenantId);
}

/**
 * Checks if a user has ANY of the specified permissions
 *
 * @param userId - User ID to check
 * @param permissions - Array of permission codes
 * @param tenantId - Optional tenant ID (defaults to current tenant)
 * @returns Promise<boolean> - True if user has at least one permission
 *
 * @example
 * const canModerate = await hasAnyPermission(userId, ['member.edit', 'member.delete']);
 */
export async function hasAnyPermission(
  userId: string,
  permissions: string[],
  tenantId?: string
): Promise<boolean> {
  const userRoleService = container.get<UserRoleService>(TYPES.UserRoleService);
  return await userRoleService.canUserAny(permissions, tenantId);
}

/**
 * Checks if a user has ALL of the specified permissions
 *
 * @param userId - User ID to check
 * @param permissions - Array of permission codes
 * @param tenantId - Optional tenant ID (defaults to current tenant)
 * @returns Promise<boolean> - True if user has all permissions
 *
 * @example
 * const canFullyManage = await hasAllPermissions(userId, ['member.create', 'member.edit', 'member.delete']);
 */
export async function hasAllPermissions(
  userId: string,
  permissions: string[],
  tenantId?: string
): Promise<boolean> {
  const userRoleService = container.get<UserRoleService>(TYPES.UserRoleService);
  return await userRoleService.canUserAll(permissions, tenantId);
}

/**
 * Gets user's role codes (for metadata evaluation context)
 *
 * @param userId - User ID to get roles for
 * @param tenantId - Optional tenant ID (defaults to current tenant)
 * @returns Promise<string[]> - Array of role codes
 *
 * @example
 * const roles = await getUserRoles(userId);
 * console.log('User roles:', roles);
 */
export async function getUserRoles(
  userId: string,
  tenantId?: string
): Promise<string[]> {
  const userRoleService = container.get<UserRoleService>(TYPES.UserRoleService);
  return await userRoleService.getUserRoleCodes(userId, tenantId);
}

/**
 * Checks if user is a super admin
 *
 * @param userId - Optional user ID (uses current user if not provided)
 * @returns Promise<boolean> - True if user is super admin
 *
 * @example
 * const isSuperAdmin = await checkSuperAdmin(userId);
 * if (isSuperAdmin) {
 *   showAdminPanel();
 * }
 */
export async function checkSuperAdmin(userId?: string): Promise<boolean> {
  const userRoleService = container.get<UserRoleService>(TYPES.UserRoleService);
  return await userRoleService.isSuperAdmin(userId);
}
