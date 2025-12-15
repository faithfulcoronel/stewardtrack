/**
 * Menu Access Service
 *
 * Integrates menu system with AccessGate for unified access control.
 * Provides access checking for individual menu items based on RBAC + Licensing.
 */

import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IMenuItemRepository } from '@/repositories/menuItem.repository';
import { AccessGate, AccessCheckResult } from '@/lib/access-gate/AccessGate';
import { UserRoleService } from '@/services/UserRoleService';
import { LicenseFeatureService } from '@/services/LicenseFeatureService';

export interface MenuAccessCheckOptions {
  featureKey?: string;
  permissionKey?: string;
  roleIds?: string[];
}

/**
 * Access Gate implementation for menu items
 */
export class MenuItemAccessGate extends AccessGate {
  constructor(
    private menuId: string,
    private userRoleService: UserRoleService,
    private licenseFeatureService: LicenseFeatureService,
    private menuRepo: IMenuItemRepository
  ) {
    super({ gracefulFail: false });
  }

  async check(userId: string, tenantId?: string): Promise<AccessCheckResult> {
    if (!tenantId) {
      return {
        allowed: false,
        reason: 'Tenant context required for menu access check',
      };
    }

    try {
      // Get menu item details
      const menuItem = await this.menuRepo.findById(this.menuId);

      if (!menuItem) {
        return {
          allowed: false,
          reason: 'Menu item not found',
        };
      }

      // Check if menu item is visible
      const metadata = menuItem.metadata as any;
      const isVisible = metadata?.is_visible !== false;
      if (!isVisible) {
        return {
          allowed: false,
          reason: 'Menu item is not visible',
        };
      }

      // Get user's role codes
      const roleCodes = await this.userRoleService.getUserRoleCodes(userId, tenantId);

      // For now, assume role access is granted if user has roles
      // TODO: Implement proper role-menu item relationship checking
      const hasRoleAccess = roleCodes.length > 0;

      // Check feature licensing if feature_key exists
      const featureKey = menuItem.feature_key;
      if (featureKey) {
        const activeFeatures = await this.licenseFeatureService.getActiveFeatures(tenantId);
        const featureCodes = activeFeatures.map((f: any) => f.feature_code);

        if (!featureCodes.includes(featureKey)) {
          return {
            allowed: false,
            reason: `Feature '${featureKey}' not available in your license plan`,
            requiresUpgrade: true,
            lockedFeatures: [featureKey],
          };
        }
      }

      // Require role-based access
      if (!hasRoleAccess) {
        return {
          allowed: false,
          reason: 'Insufficient role permissions for this menu item',
          missingPermissions: ['role_menu_access'],
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Menu access check failed:', error);
      return {
        allowed: false,
        reason: error instanceof Error ? error.message : 'Access check failed',
      };
    }
  }
}

/**
 * Service for managing menu access checks
 */
@injectable()
export class MenuAccessService {
  constructor(
    @inject(TYPES.IMenuItemRepository)
    private menuRepo: IMenuItemRepository,
    @inject(TYPES.UserRoleService)
    private userRoleService: UserRoleService,
    @inject(TYPES.LicenseFeatureService)
    private licenseFeatureService: LicenseFeatureService
  ) {}

  /**
   * Create an AccessGate for a specific menu item
   */
  createMenuGate(menuId: string): MenuItemAccessGate {
    return new MenuItemAccessGate(
      menuId,
      this.userRoleService,
      this.licenseFeatureService,
      this.menuRepo
    );
  }

  /**
   * Check access to a menu item
   */
  async checkAccess(
    menuId: string,
    userId: string,
    tenantId: string
  ): Promise<AccessCheckResult> {
    const gate = this.createMenuGate(menuId);
    return gate.check(userId, tenantId);
  }

  /**
   * Batch check access for multiple menu items
   */
  async checkMultipleAccess(
    menuIds: string[],
    userId: string,
    tenantId: string
  ): Promise<Record<string, AccessCheckResult>> {
    const results: Record<string, AccessCheckResult> = {};

    await Promise.all(
      menuIds.map(async (menuId) => {
        const result = await this.checkAccess(menuId, userId, tenantId);
        results[menuId] = result;
      })
    );

    return results;
  }

  /**
   * Get all accessible menu items for a user
   */
  async getAccessibleMenuItems(
    userId: string,
    tenantId: string
  ): Promise<any[]> {
    // Get all menu items for tenant
    const { data: menuItems } = await this.menuRepo.findAll({
      select: '*',
      filters: {
        tenant_id: { operator: 'eq', value: tenantId },
        deleted_at: { operator: 'isEmpty', value: true },
      },
      order: { column: 'sort_order', ascending: true },
    });

    if (!menuItems || menuItems.length === 0) {
      return [];
    }

    // Filter by access
    const accessibleItems: any[] = [];

    for (const item of menuItems) {
      const result = await this.checkAccess(item.id, userId, tenantId);
      if (result.allowed) {
        accessibleItems.push({
          ...item,
          hasAccess: true,
        });
      }
    }

    return accessibleItems;
  }

  /**
   * Get menu items with access status (including locked items)
   */
  async getMenuItemsWithStatus(
    userId: string,
    tenantId: string
  ): Promise<any[]> {
    // Get all menu items for tenant
    const { data: menuItems } = await this.menuRepo.findAll({
      select: '*',
      filters: {
        tenant_id: { operator: 'eq', value: tenantId },
        deleted_at: { operator: 'isEmpty', value: true },
      },
      order: { column: 'sort_order', ascending: true },
    });

    if (!menuItems || menuItems.length === 0) {
      return [];
    }

    // Filter and annotate with access status
    const itemsWithStatus: any[] = [];

    for (const item of menuItems) {
      // TODO: Implement proper role-menu item relationship checking

      // Check full access
      const result = await this.checkAccess(item.id, userId, tenantId);

      itemsWithStatus.push({
        ...item,
        hasAccess: result.allowed,
        locked: !result.allowed,
        lockReason: result.reason,
        requiresUpgrade: result.requiresUpgrade,
        missingPermissions: result.missingPermissions,
        lockedFeatures: result.lockedFeatures,
      });
    }

    return itemsWithStatus;
  }

  /**
   * Verify access to a menu item (throws on denial)
   */
  async verifyAccess(
    menuId: string,
    userId: string,
    tenantId: string
  ): Promise<void> {
    const gate = this.createMenuGate(menuId);
    await gate.verify(userId, tenantId);
  }
}
