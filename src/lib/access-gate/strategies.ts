/**
 * Access Gate Strategies
 *
 * Concrete implementations of different access check strategies
 */

import 'server-only';
import { AccessGate, AccessCheckResult, AccessGateConfig } from './AccessGate';
import { checkSurfaceAccess, hasPermission, hasAllPermissions, hasAnyPermission, checkSuperAdmin, checkTenantAdmin } from '@/lib/rbac/permissionHelpers';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { LicensingService } from '@/services/LicensingService';
import { UserRoleService } from '@/services/UserRoleService';
import { tenantUtils } from '@/utils/tenantUtils';

/**
 * Surface Access Gate - Checks RBAC + Licensing for a specific surface
 */
export class SurfaceAccessGate extends AccessGate {
  constructor(
    private surfaceId: string,
    config: AccessGateConfig = {}
  ) {
    super(config);
  }

  async check(userId: string, tenantId?: string): Promise<AccessCheckResult> {
    try {
      const hasAccess = await checkSurfaceAccess(userId, this.surfaceId, tenantId);

      if (!hasAccess) {
        return {
          allowed: false,
          reason: `Access denied to surface: ${this.surfaceId}`,
          redirectTo: this.config.fallbackPath || '/unauthorized',
        };
      }

      return { allowed: true };
    } catch (error) {
      return {
        allowed: false,
        reason: error instanceof Error ? error.message : 'Access check failed',
      };
    }
  }
}

/**
 * Permission Gate - Checks RBAC permissions
 */
export class PermissionGate extends AccessGate {
  constructor(
    private permissions: string | string[],
    private mode: 'all' | 'any' = 'all',
    config: AccessGateConfig = {}
  ) {
    super(config);
  }

  async check(userId: string, tenantId?: string): Promise<AccessCheckResult> {
    try {
      const permissionArray = Array.isArray(this.permissions)
        ? this.permissions
        : [this.permissions];

      let hasAccess: boolean;

      if (permissionArray.length === 1) {
        hasAccess = await hasPermission(userId, permissionArray[0], tenantId);
      } else if (this.mode === 'all') {
        hasAccess = await hasAllPermissions(userId, permissionArray, tenantId);
      } else {
        hasAccess = await hasAnyPermission(userId, permissionArray, tenantId);
      }

      if (!hasAccess) {
        return {
          allowed: false,
          reason: `Missing required permission(s)`,
          missingPermissions: permissionArray,
          redirectTo: this.config.fallbackPath || '/unauthorized',
        };
      }

      return { allowed: true };
    } catch (error) {
      return {
        allowed: false,
        reason: error instanceof Error ? error.message : 'Permission check failed',
      };
    }
  }
}

/**
 * License Gate - Checks if tenant has license for a feature
 */
export class LicenseGate extends AccessGate {
  constructor(
    private featureCode: string,
    config: AccessGateConfig = {}
  ) {
    super(config);
  }

  async check(userId: string, tenantId?: string): Promise<AccessCheckResult> {
    try {
      const licensingService = container.get<LicensingService>(TYPES.LicensingService);
      const effectiveTenantId = tenantId || await tenantUtils.getTenantId();

      if (!effectiveTenantId) {
        return {
          allowed: false,
          reason: 'No tenant context available',
        };
      }

      const hasLicense = await licensingService.hasFeatureAccess(this.featureCode, effectiveTenantId);

      if (!hasLicense) {
        return {
          allowed: false,
          reason: `Feature requires license upgrade`,
          requiresUpgrade: true,
          lockedFeatures: [this.featureCode],
          redirectTo: this.config.fallbackPath || '/upgrade',
        };
      }

      return { allowed: true };
    } catch (error) {
      return {
        allowed: false,
        reason: error instanceof Error ? error.message : 'License check failed',
      };
    }
  }
}

/**
 * Role Gate - Checks if user has specific roles
 */
export class RoleGate extends AccessGate {
  constructor(
    private roles: string | string[],
    private mode: 'all' | 'any' = 'any',
    config: AccessGateConfig = {}
  ) {
    super(config);
  }

  async check(userId: string, tenantId?: string): Promise<AccessCheckResult> {
    try {
      const userRoleService = container.get<UserRoleService>(TYPES.UserRoleService);
      const userRoles = await userRoleService.getUserRoleCodes(userId, tenantId);

      const roleArray = Array.isArray(this.roles) ? this.roles : [this.roles];

      let hasAccess: boolean;
      if (this.mode === 'all') {
        hasAccess = roleArray.every(role => userRoles.includes(role));
      } else {
        hasAccess = roleArray.some(role => userRoles.includes(role));
      }

      if (!hasAccess) {
        return {
          allowed: false,
          reason: `User does not have required role(s): ${roleArray.join(', ')}`,
          redirectTo: this.config.fallbackPath || '/unauthorized',
        };
      }

      return { allowed: true };
    } catch (error) {
      return {
        allowed: false,
        reason: error instanceof Error ? error.message : 'Role check failed',
      };
    }
  }
}

/**
 * Super Admin Gate - Checks if user is a super admin
 * Uses the centralized getUserAdminRole() RPC method
 */
export class SuperAdminGate extends AccessGate {
  async check(userId: string): Promise<AccessCheckResult> {
    try {
      console.log('[SuperAdminGate] Checking super admin access');

      if (!userId) {
        console.log('[SuperAdminGate] No userId provided');
        return {
          allowed: false,
          reason: 'No user ID provided',
          redirectTo: this.config.fallbackPath || '/unauthorized',
        };
      }

      // Use centralized checkSuperAdmin helper (which uses get_user_admin_role RPC)
      const isSuperAdmin = await checkSuperAdmin();
      console.log('[SuperAdminGate] isSuperAdmin result:', isSuperAdmin);

      if (!isSuperAdmin) {
        return {
          allowed: false,
          reason: 'Super admin access required',
          redirectTo: this.config.fallbackPath || '/unauthorized',
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('[SuperAdminGate] Error:', error);
      return {
        allowed: false,
        reason: error instanceof Error ? error.message : 'Super admin check failed',
      };
    }
  }
}

/**
 * Tenant Admin Gate - Checks if user is a tenant admin
 * Uses the centralized getUserAdminRole() method
 */
export class TenantAdminGate extends AccessGate {
  async check(userId: string): Promise<AccessCheckResult> {
    try {
      if (!userId) {
        return {
          allowed: false,
          reason: 'No user ID provided',
          redirectTo: this.config.fallbackPath || '/unauthorized',
        };
      }

      const isTenantAdmin = await checkTenantAdmin();

      if (!isTenantAdmin) {
        return {
          allowed: false,
          reason: 'Tenant admin access required',
          redirectTo: this.config.fallbackPath || '/unauthorized',
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('[TenantAdminGate] Error:', error);
      return {
        allowed: false,
        reason: error instanceof Error ? error.message : 'Tenant admin check failed',
      };
    }
  }
}

/**
 * Authenticated Gate - Simply checks if user is authenticated
 */
export class AuthenticatedGate extends AccessGate {
  async check(userId: string): Promise<AccessCheckResult> {
    if (!userId) {
      return {
        allowed: false,
        reason: 'Authentication required',
        redirectTo: this.config.fallbackPath || '/login',
      };
    }

    return { allowed: true };
  }
}

/**
 * Custom Function Gate - Allows custom logic
 */
export class CustomGate extends AccessGate {
  constructor(
    private checkFn: (userId: string, tenantId?: string) => Promise<boolean>,
    private errorMessage: string = 'Access denied',
    config: AccessGateConfig = {}
  ) {
    super(config);
  }

  async check(userId: string, tenantId?: string): Promise<AccessCheckResult> {
    try {
      const allowed = await this.checkFn(userId, tenantId);

      if (!allowed) {
        return {
          allowed: false,
          reason: this.errorMessage,
          redirectTo: this.config.fallbackPath,
        };
      }

      return { allowed: true };
    } catch (error) {
      return {
        allowed: false,
        reason: error instanceof Error ? error.message : 'Custom check failed',
      };
    }
  }
}
