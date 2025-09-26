import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IMenuItemRepository } from '@/repositories/menuItem.repository';
import { LicenseFeatureService } from '@/services/LicenseFeatureService';
import { TenantService } from '@/services/TenantService';

interface SidebarItem {
  name: string;
  href?: string;
  icon: string | null;
  section?: string;
  submenu?: SidebarItem[];
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
}

export type { SidebarItem };
