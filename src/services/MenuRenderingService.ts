/**
 * Menu Rendering Service
 *
 * Transforms flat menu items into hierarchical structures for UI rendering.
 * Handles nested menu items, sorting, and filtering.
 */

import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IMenuItemRepository } from '@/repositories/menuItem.repository';
import type { MenuItem } from '@/models/menuItem.model';

export interface MenuItemNode extends MenuItem {
  children?: MenuItemNode[];
  hasAccess?: boolean;
  locked?: boolean;
  lockReason?: string;
  requiresUpgrade?: boolean;
  level?: number;
}

export interface MenuRenderingOptions {
  includeHidden?: boolean;
  includeSystem?: boolean;
  maxDepth?: number;
  filterBySection?: string;
}

/**
 * Service for transforming menu items into renderable hierarchies
 */
@injectable()
export class MenuRenderingService {
  constructor(
    @inject(TYPES.IMenuItemRepository)
    private menuRepo: IMenuItemRepository
  ) {}

  /**
   * Get menu items as a flat list
   */
  async getFlatMenuItems(
    tenantId: string,
    options?: MenuRenderingOptions
  ): Promise<MenuItem[]> {
    const filters: any = {
      tenant_id: { operator: 'eq', value: tenantId },
      deleted_at: { operator: 'isEmpty', value: true },
    };

    if (!options?.includeHidden) {
      filters.is_visible = { operator: 'eq', value: true };
    }

    if (!options?.includeSystem) {
      filters.is_system = { operator: 'eq', value: false };
    }

    if (options?.filterBySection) {
      filters.section = { operator: 'eq', value: options.filterBySection };
    }

    const { data: menuItems } = await this.menuRepo.findAll({
      select: '*',
      filters,
      order: { column: 'sort_order', ascending: true },
    });

    return menuItems || [];
  }

  /**
   * Build hierarchical menu structure from flat list
   */
  buildHierarchy(
    menuItems: MenuItem[],
    parentId: string | null = null,
    level: number = 0,
    maxDepth?: number
  ): MenuItemNode[] {
    if (maxDepth !== undefined && level >= maxDepth) {
      return [];
    }

    const children = menuItems
      .filter(item => item.parent_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(item => {
        const node: MenuItemNode = {
          ...item,
          level,
          children: this.buildHierarchy(menuItems, item.id, level + 1, maxDepth),
        };
        return node;
      });

    return children;
  }

  /**
   * Get hierarchical menu structure for a tenant
   */
  async getMenuHierarchy(
    tenantId: string,
    options?: MenuRenderingOptions
  ): Promise<MenuItemNode[]> {
    const menuItems = await this.getFlatMenuItems(tenantId, options);
    return this.buildHierarchy(menuItems, null, 0, options?.maxDepth);
  }

  /**
   * Get menu items grouped by section
   */
  async getMenuItemsBySection(
    tenantId: string,
    options?: MenuRenderingOptions
  ): Promise<Record<string, MenuItemNode[]>> {
    const menuItems = await this.getFlatMenuItems(tenantId, options);

    const sections: Record<string, MenuItemNode[]> = {};

    // Group by section
    for (const item of menuItems) {
      const section = item.section || 'default';
      if (!sections[section]) {
        sections[section] = [];
      }
      sections[section].push({ ...item, level: 0 });
    }

    // Build hierarchy for each section
    for (const section in sections) {
      const sectionItems = sections[section];
      sections[section] = this.buildHierarchy(
        menuItems.filter(item => (item.section || 'default') === section),
        null,
        0,
        options?.maxDepth
      );
    }

    return sections;
  }

  /**
   * Get breadcrumb trail for a menu item
   */
  async getBreadcrumbs(
    menuItemId: string,
    tenantId: string
  ): Promise<MenuItem[]> {
    const breadcrumbs: MenuItem[] = [];
    let currentId: string | null = menuItemId;

    while (currentId) {
      const { data: item } = await this.menuRepo.findById(currentId);

      if (!item || item.tenant_id !== tenantId) {
        break;
      }

      breadcrumbs.unshift(item);
      currentId = item.parent_id;
    }

    return breadcrumbs;
  }

  /**
   * Get all descendants of a menu item
   */
  getDescendants(
    menuItems: MenuItem[],
    parentId: string
  ): MenuItem[] {
    const descendants: MenuItem[] = [];
    const children = menuItems.filter(item => item.parent_id === parentId);

    for (const child of children) {
      descendants.push(child);
      descendants.push(...this.getDescendants(menuItems, child.id));
    }

    return descendants;
  }

  /**
   * Flatten hierarchical menu structure
   */
  flattenHierarchy(nodes: MenuItemNode[]): MenuItem[] {
    const flat: MenuItem[] = [];

    const flatten = (items: MenuItemNode[]) => {
      for (const item of items) {
        const { children, hasAccess, locked, lockReason, requiresUpgrade, level, ...menuItem } = item;
        flat.push(menuItem as MenuItem);
        if (children && children.length > 0) {
          flatten(children);
        }
      }
    };

    flatten(nodes);
    return flat;
  }

  /**
   * Filter hierarchy by predicate
   */
  filterHierarchy(
    nodes: MenuItemNode[],
    predicate: (node: MenuItemNode) => boolean
  ): MenuItemNode[] {
    return nodes
      .map(node => {
        const filteredChildren = node.children
          ? this.filterHierarchy(node.children, predicate)
          : [];

        // Include node if it matches predicate OR has matching children
        if (predicate(node) || filteredChildren.length > 0) {
          return {
            ...node,
            children: filteredChildren,
          };
        }

        return null;
      })
      .filter((node): node is MenuItemNode => node !== null);
  }

  /**
   * Sort menu hierarchy by custom comparator
   */
  sortHierarchy(
    nodes: MenuItemNode[],
    comparator: (a: MenuItemNode, b: MenuItemNode) => number
  ): MenuItemNode[] {
    const sorted = [...nodes].sort(comparator);

    return sorted.map(node => ({
      ...node,
      children: node.children
        ? this.sortHierarchy(node.children, comparator)
        : undefined,
    }));
  }

  /**
   * Calculate menu item depth
   */
  calculateDepth(nodes: MenuItemNode[]): number {
    let maxDepth = 0;

    const traverse = (items: MenuItemNode[], depth: number) => {
      maxDepth = Math.max(maxDepth, depth);
      for (const item of items) {
        if (item.children && item.children.length > 0) {
          traverse(item.children, depth + 1);
        }
      }
    };

    traverse(nodes, 1);
    return maxDepth;
  }

  /**
   * Find menu item by path
   */
  findByPath(nodes: MenuItemNode[], path: string): MenuItemNode | null {
    for (const node of nodes) {
      if (node.path === path) {
        return node;
      }

      if (node.children && node.children.length > 0) {
        const found = this.findByPath(node.children, path);
        if (found) {
          return found;
        }
      }
    }

    return null;
  }

  /**
   * Get active path trail (for highlighting active menu items)
   */
  getActiveTrail(nodes: MenuItemNode[], activePath: string): string[] {
    const trail: string[] = [];

    const findTrail = (items: MenuItemNode[], path: string[]): boolean => {
      for (const item of items) {
        const currentPath = [...path, item.id];

        if (item.path === activePath) {
          trail.push(...currentPath);
          return true;
        }

        if (item.children && item.children.length > 0) {
          if (findTrail(item.children, currentPath)) {
            return true;
          }
        }
      }

      return false;
    };

    findTrail(nodes, []);
    return trail;
  }

  /**
   * Annotate menu items with access status
   */
  annotateWithAccess(
    nodes: MenuItemNode[],
    accessMap: Record<string, { allowed: boolean; reason?: string; requiresUpgrade?: boolean }>
  ): MenuItemNode[] {
    return nodes.map(node => {
      const access = accessMap[node.id];
      const annotated: MenuItemNode = {
        ...node,
        hasAccess: access?.allowed ?? false,
        locked: !access?.allowed,
        lockReason: access?.reason,
        requiresUpgrade: access?.requiresUpgrade,
      };

      if (node.children && node.children.length > 0) {
        annotated.children = this.annotateWithAccess(node.children, accessMap);
      }

      return annotated;
    });
  }
}
