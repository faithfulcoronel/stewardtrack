/**
 * Menu Converter Utility
 *
 * Converts MenuItem[] array to AdminNavSection[] format for sidebar rendering.
 * Groups menu items by section and preserves hierarchy.
 */

import type { MenuItem } from "@/models/menuItem.model";
import type { AdminNavSection } from "@/components/admin/sidebar-nav";

export interface MenuItemNode extends MenuItem {
  children?: MenuItemNode[];
}

/**
 * Build hierarchical menu structure from flat list
 */
export function buildMenuHierarchy(
  menuItems: MenuItem[],
  parentId: string | null = null
): MenuItemNode[] {
  return menuItems
    .filter(item => item.parent_id === parentId)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(item => ({
      ...item,
      children: buildMenuHierarchy(menuItems, item.id),
    }));
}

/**
 * Convert flat MenuItem[] to grouped AdminNavSection[]
 *
 * Groups items by section, builds hierarchy, and formats for AdminSidebar.
 * Only includes top-level items in the sections (nested items are rendered recursively).
 */
export function convertMenuItemsToSections(menuItems: MenuItem[]): AdminNavSection[] {
  // Group items by section
  const sectionMap = new Map<string, MenuItem[]>();

  for (const item of menuItems) {
    const section = item.section || "General";
    if (!sectionMap.has(section)) {
      sectionMap.set(section, []);
    }
    sectionMap.get(section)!.push(item);
  }

  // Build hierarchy for each section and convert to AdminNavSection format
  const sections: AdminNavSection[] = [];

  // Define section order (matching existing sidebar structure)
  const sectionOrder = ["General", "Community", "Financial", "Administration"];

  for (const sectionLabel of sectionOrder) {
    const items = sectionMap.get(sectionLabel);
    if (!items || items.length === 0) continue;

    // Build hierarchy for this section
    const hierarchy = buildMenuHierarchy(items, null);

    // Convert to AdminNavItem format (only top-level items)
    const navItems = hierarchy.map(item => ({
      title: item.label,
      href: item.path,
      icon: (item.icon || "dashboard") as any, // Icon key, will be resolved by sidebar
      badge: item.badge_text || undefined,
      description: item.description || undefined,
      menuItemId: item.id, // Store original ID for access control
    }));

    if (navItems.length > 0) {
      sections.push({
        label: sectionLabel,
        items: navItems,
      });
    }
  }

  // Handle any remaining sections not in the predefined order
  for (const [sectionLabel, items] of sectionMap.entries()) {
    if (sectionOrder.includes(sectionLabel)) continue;

    const hierarchy = buildMenuHierarchy(items, null);
    const navItems = hierarchy.map(item => ({
      title: item.label,
      href: item.path,
      icon: (item.icon || "dashboard") as any,
      badge: item.badge_text || undefined,
      description: item.description || undefined,
      menuItemId: item.id,
    }));

    if (navItems.length > 0) {
      sections.push({
        label: sectionLabel,
        items: navItems,
      });
    }
  }

  return sections;
}

/**
 * Get menu item by ID from flat list
 */
export function findMenuItemById(
  menuItems: MenuItem[],
  id: string
): MenuItem | undefined {
  return menuItems.find(item => item.id === id);
}

/**
 * Get all descendants of a menu item
 */
export function getMenuItemDescendants(
  menuItems: MenuItem[],
  parentId: string
): MenuItem[] {
  const descendants: MenuItem[] = [];
  const children = menuItems.filter(item => item.parent_id === parentId);

  for (const child of children) {
    descendants.push(child);
    descendants.push(...getMenuItemDescendants(menuItems, child.id));
  }

  return descendants;
}

/**
 * Flatten menu hierarchy back to flat list
 */
export function flattenMenuHierarchy(nodes: MenuItemNode[]): MenuItem[] {
  const flat: MenuItem[] = [];

  const flatten = (items: MenuItemNode[]) => {
    for (const item of items) {
      const { children, ...menuItem } = item;
      flat.push(menuItem as MenuItem);
      if (children && children.length > 0) {
        flatten(children);
      }
    }
  };

  flatten(nodes);
  return flat;
}
