/**
 * Metadata Evaluation Context Builder
 *
 * Helper utility to build complete MetadataEvaluationContext objects
 * including RBAC roles, permissions, and licensing information.
 *
 * Usage:
 * const context = await buildMetadataContext(userId, tenantId, searchParams);
 * const evaluatedProps = evaluateMetadataProps(props, dataScope, actions, context);
 */

import 'server-only';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { UserRoleService } from '@/services/UserRoleService';
import type { LicensingService } from '@/services/LicensingService';
import { tenantUtils } from '@/utils/tenantUtils';
import type { MetadataEvaluationContext } from './evaluation';

/**
 * Builds a complete metadata evaluation context with RBAC and licensing information
 *
 * @param userId - User ID to build context for
 * @param tenantId - Optional tenant ID (defaults to current tenant)
 * @param searchParams - Optional search parameters from URL
 * @param featureFlags - Optional feature flags
 * @returns Complete MetadataEvaluationContext with all fields populated
 *
 * @example
 * const context = await buildMetadataContext(userId);
 * // Use context for metadata evaluation
 * const props = evaluateMetadataProps(rawProps, dataScope, actions, context);
 */
export async function buildMetadataContext(
  userId: string,
  tenantId?: string,
  searchParams?: Record<string, string | string[] | undefined>,
  featureFlags?: Record<string, boolean>
): Promise<MetadataEvaluationContext> {
  const userRoleService = container.get<UserRoleService>(TYPES.UserRoleService);
  const licensingService = container.get<LicensingService>(TYPES.LicensingService);

  const effectiveTenantId = tenantId || await tenantUtils.getTenantId();

  if (!effectiveTenantId) {
    // Return minimal context for users without tenant
    return {
      role: 'guest',
      roles: ['guest'],
      permissions: [],
      featureFlags: featureFlags || {},
      searchParams: searchParams || {},
      licenseFeatures: [],
      licensedSurfaces: [],
      licenseTier: 'basic',
    };
  }

  try {
    // Fetch user permissions and roles
    const userPermissions = await userRoleService.getUserPermissions(userId, effectiveTenantId);
    const userRoleCodes = await userRoleService.getUserRoleCodes(userId, effectiveTenantId);

    // Extract permission codes from user permissions
    const permissionCodes = userPermissions.permissions?.map(p => p.code) || [];

    // Fetch licensing information
    const licensingSummary = await licensingService.getTenantLicensingSummary(effectiveTenantId);
    const licensedSurfaces: string[] = []; // Surface bindings removed

    // Extract license features from active bundles
    const licenseFeatures: string[] = [];
    for (const bundle of licensingSummary.licensed_bundles) {
      if (bundle.code) {
        licenseFeatures.push(bundle.code);
      }
    }

    // Determine license tier from active offerings
    let licenseTier = 'basic';
    if (licensingSummary.active_offerings.length > 0) {
      const offering = licensingSummary.active_offerings[0];
      licenseTier = offering.tier || 'basic';
    }

    // Determine primary role (admin role or first role)
    const primaryRole = userPermissions.adminRole || userRoleCodes[0] || 'guest';

    return {
      role: primaryRole,
      roles: userRoleCodes.length > 0 ? userRoleCodes : ['guest'],
      permissions: permissionCodes,
      featureFlags: featureFlags || {},
      searchParams: searchParams || {},
      licenseFeatures,
      licensedSurfaces,
      licenseTier,
    };
  } catch (error) {
    console.error('Error building metadata context:', error);

    // Return fallback context on error
    return {
      role: 'guest',
      roles: ['guest'],
      permissions: [],
      featureFlags: featureFlags || {},
      searchParams: searchParams || {},
      licenseFeatures: [],
      licensedSurfaces: [],
      licenseTier: 'basic',
    };
  }
}

/**
 * Builds a minimal metadata context for public/unauthenticated pages
 *
 * @param searchParams - Optional search parameters from URL
 * @param featureFlags - Optional feature flags
 * @returns Minimal MetadataEvaluationContext for guest users
 *
 * @example
 * const context = buildGuestContext(searchParams);
 */
export function buildGuestContext(
  searchParams?: Record<string, string | string[] | undefined>,
  featureFlags?: Record<string, boolean>
): MetadataEvaluationContext {
  return {
    role: 'guest',
    roles: ['guest'],
    permissions: [],
    featureFlags: featureFlags || {},
    searchParams: searchParams || {},
    licenseFeatures: [],
    licensedSurfaces: [],
    licenseTier: 'basic',
  };
}

/**
 * Adds license context to an existing metadata evaluation context
 * Useful when you have a partial context and need to add licensing information
 *
 * @param baseContext - Existing context without license information
 * @param tenantId - Tenant ID to get licensing for
 * @returns Enhanced context with license information
 *
 * @example
 * const baseContext = { role: 'admin', roles: ['admin'], ... };
 * const enhancedContext = await enhanceContextWithLicensing(baseContext, tenantId);
 */
export async function enhanceContextWithLicensing(
  baseContext: MetadataEvaluationContext,
  tenantId?: string
): Promise<MetadataEvaluationContext> {
  const licensingService = container.get<LicensingService>(TYPES.LicensingService);

  const effectiveTenantId = tenantId || await tenantUtils.getTenantId();

  if (!effectiveTenantId) {
    return {
      ...baseContext,
      licenseFeatures: [],
      licensedSurfaces: [],
      licenseTier: 'basic',
    };
  }

  try {
    const licensingSummary = await licensingService.getTenantLicensingSummary(effectiveTenantId);
    const licensedSurfaces: string[] = []; // Surface bindings removed

    const licenseFeatures: string[] = [];
    for (const bundle of licensingSummary.licensed_bundles) {
      if (bundle.code) {
        licenseFeatures.push(bundle.code);
      }
    }

    let licenseTier = 'basic';
    if (licensingSummary.active_offerings.length > 0) {
      const offering = licensingSummary.active_offerings[0];
      licenseTier = offering.tier || 'basic';
    }

    return {
      ...baseContext,
      licenseFeatures,
      licensedSurfaces,
      licenseTier,
    };
  } catch (error) {
    console.error('Error enhancing context with licensing:', error);
    return {
      ...baseContext,
      licenseFeatures: [],
      licensedSurfaces: [],
      licenseTier: 'basic',
    };
  }
}

/**
 * Type guard to check if a context has license information
 *
 * @param context - Context to check
 * @returns True if context has license information
 */
export function hasLicenseContext(context: MetadataEvaluationContext): boolean {
  return (
    context.licenseFeatures !== undefined &&
    context.licensedSurfaces !== undefined &&
    context.licenseTier !== undefined
  );
}
