/**
 * Access Gate Factory
 *
 * Factory Pattern implementation for creating common access gates
 * with simple, fluent API
 */

import { AccessGateConfig, CompositeAccessGate } from './AccessGate';
import {
  SurfaceAccessGate,
  PermissionGate,
  LicenseGate,
  RoleGate,
  SuperAdminGate,
  TenantAdminGate,
  AuthenticatedGate,
  CustomGate,
} from './strategies';

/**
 * Factory class for creating access gates
 */
export class AccessGateFactory {
  /**
   * Create a gate that checks surface access (RBAC + Licensing)
   *
   * @example
   * const gate = AccessGateFactory.forSurface('member-management');
   * await gate.verify(userId, tenantId);
   */
  static forSurface(surfaceId: string, config?: AccessGateConfig) {
    return new SurfaceAccessGate(surfaceId, config);
  }

  /**
   * Create a gate that checks permissions
   *
   * @example
   * // Single permission
   * const gate = AccessGateFactory.withPermission('members.edit');
   *
   * // Multiple permissions (all required)
   * const gate = AccessGateFactory.withPermission(['members.edit', 'members.delete']);
   *
   * // Multiple permissions (any one required)
   * const gate = AccessGateFactory.withPermission(['members.edit', 'members.delete'], 'any');
   */
  static withPermission(
    permission: string | string[],
    mode: 'all' | 'any' = 'all',
    config?: AccessGateConfig
  ) {
    return new PermissionGate(permission, mode, config);
  }

  /**
   * Create a gate that checks license/feature access
   *
   * @example
   * const gate = AccessGateFactory.withLicense('advanced-reports');
   * await gate.verify(userId, tenantId);
   */
  static withLicense(featureCode: string, config?: AccessGateConfig) {
    return new LicenseGate(featureCode, config);
  }

  /**
   * Create a gate that checks user roles
   *
   * @example
   * // Single role
   * const gate = AccessGateFactory.withRole('campus-pastor');
   *
   * // Multiple roles (any one required)
   * const gate = AccessGateFactory.withRole(['campus-pastor', 'senior-pastor']);
   *
   * // Multiple roles (all required)
   * const gate = AccessGateFactory.withRole(['campus-pastor', 'finance-manager'], 'all');
   */
  static withRole(
    role: string | string[],
    mode: 'all' | 'any' = 'any',
    config?: AccessGateConfig
  ) {
    return new RoleGate(role, mode, config);
  }

  /**
   * Create a gate that checks for super admin
   *
   * @example
   * const gate = AccessGateFactory.superAdminOnly();
   * await gate.verify(userId);
   */
  static superAdminOnly(config?: AccessGateConfig) {
    return new SuperAdminGate(config);
  }

  /**
   * Create a gate that checks for tenant admin
   */
  static tenantAdminOnly(config?: AccessGateConfig) {
    return new TenantAdminGate(config);
  }

  /**
   * Create a gate that grants RBAC access to super admins, tenant admins, or users
   * with the explicit rbac:manage permission.
   */
  static rbacAdmin(config: AccessGateConfig = {}) {
    const fallbackPath = config.fallbackPath ?? '/unauthorized?reason=rbac_manage_required';

    const gates = [
      AccessGateFactory.superAdminOnly({ fallbackPath }),
      AccessGateFactory.tenantAdminOnly({ fallbackPath }),
      AccessGateFactory.withPermission('rbac:manage', 'all', { fallbackPath }),
    ];

    return new CompositeAccessGate(gates, {
      ...config,
      fallbackPath,
      requireAll: false,
    });
  }


  /**
   * Create a gate that checks authentication
   *
   * @example
   * const gate = AccessGateFactory.authenticated();
   * await gate.verify(userId);
   */
  static authenticated(config?: AccessGateConfig) {
    return new AuthenticatedGate(config);
  }

  /**
   * Create a gate with custom logic
   *
   * @example
   * const gate = AccessGateFactory.custom(
   *   async (userId, tenantId) => {
   *     // Custom logic
   *     return true;
   *   },
   *   'Custom access check failed'
   * );
   */
  static custom(
    checkFn: (userId: string, tenantId?: string) => Promise<boolean>,
    errorMessage?: string,
    config?: AccessGateConfig
  ) {
    return new CustomGate(checkFn, errorMessage, config);
  }
}

// Export convenient aliases
export const Gate = AccessGateFactory;
export const gate = AccessGateFactory;
