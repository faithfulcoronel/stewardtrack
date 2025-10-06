import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IMenuItemRepository } from '@/repositories/menuItem.repository';
import { LicenseFeatureService } from '@/services/LicenseFeatureService';
import { TenantService } from '@/services/TenantService';
import { LicensingService } from '@/services/LicensingService';
import { UserRoleService } from '@/services/UserRoleService';

interface SidebarItem {
  name: string;
  href?: string;
  icon: string | null;
  section?: string;
  submenu?: SidebarItem[];
  locked?: boolean; // Indicates if item is locked due to licensing
  lockReason?: string; // Reason why item is locked
}

const DEFAULT_SECTION = 'General';

@injectable()
export class SidebarService {
  constructor(
    @inject(TYPES.IMenuItemRepository)
    private menuRepo: IMenuItemRepository,
    @inject(TYPES.LicenseFeatureService)
    private licenseFeatureService: LicenseFeatureService,
    @inject(TYPES.TenantService)
    private tenantService: TenantService,
    @inject(TYPES.LicensingService)
    private licensingService: LicensingService,
    @inject(TYPES.UserRoleService)
    private userRoleService: UserRoleService,
  ) {}

  async getMenuItems(roleIds: string[]): Promise<SidebarItem[]> {
    const enableDynamicMenu =
      process.env.NEXT_PUBLIC_ENABLE_DYNAMIC_MENU !== 'false';
    if (!enableDynamicMenu) {
      return [];
    }

    const tenant = await this.tenantService.getCurrentTenant();
    if (!tenant) {
      return [];
    }

    const { data: items } = await this.menuRepo.findAll({
      select:
        'id,parent_id,code,label,path,icon,sort_order,is_system,section,feature_key,role_menu_items(role_id)',
      filters: {
        tenant_id: { operator: 'eq', value: tenant.id },
        deleted_at: { operator: 'isEmpty', value: true },
      },
      order: { column: 'sort_order', ascending: true },
    });

    if (!items || items.length === 0) {
      return [];
    }

    const features = await this.licenseFeatureService.getActiveFeatures(tenant.id);
    const featureKeys = features.map((f: any) => f.feature_code);

    const allowed = items.filter((item: any) => {
      const roleItems = (item.role_menu_items as { role_id: string }[]) || [];
      if (
        roleItems.length > 0 &&
        !roleItems.some(r => roleIds.includes(r.role_id))
      ) {
        return false;
      }
      if (
        featureKeys.length > 0 &&
        !item.is_system &&
        item.feature_key &&
        !featureKeys.includes(item.feature_key)
      ) {
        return false;
      }
      return true;
    });

    if (allowed.length === 0) {
      return [];
    }

    const map = new Map<string, any>();
    allowed.forEach(it => map.set(it.id, { ...it, submenu: [] }));

    const roots: any[] = [];
    map.forEach(item => {
      if (item.parent_id && map.has(item.parent_id)) {
        map.get(item.parent_id).submenu.push(item);
      } else {
        roots.push(item);
      }
    });

    const sortItems = (arr: any[]) => {
      arr.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      arr.forEach(i => i.submenu && sortItems(i.submenu));
    };
    sortItems(roots);

    const convert = (item: any, parentSection?: string): SidebarItem => {
      const section = item.section ?? parentSection ?? DEFAULT_SECTION;
      return {
        name: item.label,
        href: item.path,
        icon: item.icon,
        section,
        submenu: item.submenu.map((sub: any) => convert(sub, section)),
      };
    };

    return roots.map(r => convert(r));
  }

  /**
   * Gets menu items accessible to a user based on RBAC + licensing
   * This filters menu items by both role permissions AND license state
   *
   * @param userId - User ID to get accessible menu items for
   * @param roleIds - Role IDs of the user (for backward compatibility)
   * @returns Promise<SidebarItem[]> - Filtered menu items
   */
  async getAccessibleMenuItems(userId: string, roleIds: string[]): Promise<SidebarItem[]> {
    const enableDynamicMenu = process.env.NEXT_PUBLIC_ENABLE_DYNAMIC_MENU !== 'false';
    if (!enableDynamicMenu) {
      return [];
    }

    const tenant = await this.tenantService.getCurrentTenant();
    if (!tenant) {
      return [];
    }

    // Get accessible surfaces based on RBAC + licensing
    const accessibleSurfaces = await this.userRoleService.getUserAccessibleSurfaces(userId, tenant.id);

    const { data: items } = await this.menuRepo.findAll({
      select: 'id,parent_id,code,label,path,icon,sort_order,is_system,section,feature_key,surface_id,role_menu_items(role_id)',
      filters: {
        tenant_id: { operator: 'eq', value: tenant.id },
        deleted_at: { operator: 'isEmpty', value: true },
      },
      order: { column: 'sort_order', ascending: true },
    });

    if (!items || items.length === 0) {
      return [];
    }

    const features = await this.licenseFeatureService.getActiveFeatures(tenant.id);
    const featureKeys = features.map((f: any) => f.feature_code);

    const allowed = items.filter((item: any) => {
      // Check role permissions
      const roleItems = (item.role_menu_items as { role_id: string }[]) || [];
      if (roleItems.length > 0 && !roleItems.some(r => roleIds.includes(r.role_id))) {
        return false;
      }

      // Check feature licensing
      if (featureKeys.length > 0 && !item.is_system && item.feature_key && !featureKeys.includes(item.feature_key)) {
        return false;
      }

      // Check surface licensing if surface_id is present
      if (item.surface_id && !accessibleSurfaces.includes(item.surface_id)) {
        return false;
      }

      return true;
    });

    if (allowed.length === 0) {
      return [];
    }

    const map = new Map<string, any>();
    allowed.forEach(it => map.set(it.id, { ...it, submenu: [] }));

    const roots: any[] = [];
    map.forEach(item => {
      if (item.parent_id && map.has(item.parent_id)) {
        map.get(item.parent_id).submenu.push(item);
      } else {
        roots.push(item);
      }
    });

    const sortItems = (arr: any[]) => {
      arr.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      arr.forEach(i => i.submenu && sortItems(i.submenu));
    };
    sortItems(roots);

    const convert = (item: any, parentSection?: string): SidebarItem => {
      const section = item.section ?? parentSection ?? DEFAULT_SECTION;
      return {
        name: item.label,
        href: item.path,
        icon: item.icon,
        section,
        submenu: item.submenu.map((sub: any) => convert(sub, section)),
      };
    };

    return roots.map(r => convert(r));
  }

  /**
   * Gets menu items with license status indicators
   * Shows all RBAC-accessible items, but marks those locked due to licensing
   *
   * @param userId - User ID to get menu items for
   * @param roleIds - Role IDs of the user
   * @returns Promise<SidebarItem[]> - Menu items with lock status
   */
  async getMenuItemsWithLicenseStatus(userId: string, roleIds: string[]): Promise<SidebarItem[]> {
    const enableDynamicMenu = process.env.NEXT_PUBLIC_ENABLE_DYNAMIC_MENU !== 'false';
    if (!enableDynamicMenu) {
      return [];
    }

    const tenant = await this.tenantService.getCurrentTenant();
    if (!tenant) {
      return [];
    }

    // Get both accessible and locked surfaces
    const [_accessibleSurfaces, lockedSurfaces] = await Promise.all([
      this.userRoleService.getUserAccessibleSurfaces(userId, tenant.id),
      this.userRoleService.getLockedSurfaces(userId, tenant.id),
    ]);

    const { data: items } = await this.menuRepo.findAll({
      select: 'id,parent_id,code,label,path,icon,sort_order,is_system,section,feature_key,surface_id,role_menu_items(role_id)',
      filters: {
        tenant_id: { operator: 'eq', value: tenant.id },
        deleted_at: { operator: 'isEmpty', value: true },
      },
      order: { column: 'sort_order', ascending: true },
    });

    if (!items || items.length === 0) {
      return [];
    }

    const features = await this.licenseFeatureService.getActiveFeatures(tenant.id);
    const featureKeys = features.map((f: any) => f.feature_code);

    const processedItems = items.map((item: any) => {
      // Check role permissions
      const roleItems = (item.role_menu_items as { role_id: string }[]) || [];
      const hasRolePermission = roleItems.length === 0 || roleItems.some(r => roleIds.includes(r.role_id));

      if (!hasRolePermission) {
        return null; // No RBAC access
      }

      // Check if locked due to licensing
      const isLockedBySurface = item.surface_id && lockedSurfaces.includes(item.surface_id);
      const isLockedByFeature = !item.is_system && item.feature_key && !featureKeys.includes(item.feature_key);

      return {
        ...item,
        locked: isLockedBySurface || isLockedByFeature,
        lockReason: isLockedBySurface ? 'Requires license upgrade' : isLockedByFeature ? 'Feature not available in your plan' : undefined,
      };
    }).filter(item => item !== null);

    const map = new Map<string, any>();
    processedItems.forEach(it => map.set(it.id, { ...it, submenu: [] }));

    const roots: any[] = [];
    map.forEach(item => {
      if (item.parent_id && map.has(item.parent_id)) {
        map.get(item.parent_id).submenu.push(item);
      } else {
        roots.push(item);
      }
    });

    const sortItems = (arr: any[]) => {
      arr.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      arr.forEach(i => i.submenu && sortItems(i.submenu));
    };
    sortItems(roots);

    const convert = (item: any, parentSection?: string): SidebarItem => {
      const section = item.section ?? parentSection ?? DEFAULT_SECTION;
      return {
        name: item.label,
        href: item.path,
        icon: item.icon,
        section,
        locked: item.locked,
        lockReason: item.lockReason,
        submenu: item.submenu.map((sub: any) => convert(sub, section)),
      };
    };

    return roots.map(r => convert(r));
  }
}

export type { SidebarItem };
