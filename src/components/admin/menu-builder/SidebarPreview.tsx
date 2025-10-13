"use client";

import { useMemo } from "react";
import type { MenuItem } from "@/models/menuItem.model";
import { DynamicSidebar, type DynamicNavSection } from "@/components/admin/DynamicSidebar";

interface SidebarPreviewProps {
  menuItems: MenuItem[];
}

/**
 * SidebarPreview - Live preview of the sidebar with current menu items
 *
 * Renders the DynamicSidebar component with the provided menu items
 * to show how they will appear in the actual admin sidebar.
 */
export function SidebarPreview({ menuItems }: SidebarPreviewProps) {
  // Group menu items by section
  const sections = useMemo(() => {
    const sectionMap = new Map<string, MenuItem[]>();

    // Only include visible items
    const visibleItems = menuItems.filter(item => item.is_visible);

    for (const item of visibleItems) {
      const section = item.section || 'General';
      if (!sectionMap.has(section)) {
        sectionMap.set(section, []);
      }
      sectionMap.get(section)!.push(item);
    }

    // Sort items by sort_order within each section
    for (const [_, items] of sectionMap) {
      items.sort((a, b) => a.sort_order - b.sort_order);
    }

    // Define section order
    const sectionOrder = ['General', 'Community', 'Financial', 'Administration'];
    const result: DynamicNavSection[] = [];

    // Add sections in predefined order
    for (const sectionLabel of sectionOrder) {
      const items = sectionMap.get(sectionLabel);
      if (items && items.length > 0) {
        // Only include top-level items (parent_id is null)
        const topLevelItems = items.filter(item => !item.parent_id);
        if (topLevelItems.length > 0) {
          result.push({
            label: sectionLabel,
            items: topLevelItems,
          });
        }
      }
    }

    // Add any remaining sections not in the predefined order
    for (const [sectionLabel, items] of sectionMap) {
      if (!sectionOrder.includes(sectionLabel)) {
        const topLevelItems = items.filter(item => !item.parent_id);
        if (topLevelItems.length > 0) {
          result.push({
            label: sectionLabel,
            items: topLevelItems,
          });
        }
      }
    }

    return result;
  }, [menuItems]);

  if (sections.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed border-border p-8">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            No visible menu items to preview
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create menu items and mark them as visible to see them here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="border-b border-border p-2 text-xs text-muted-foreground">
        Preview (non-interactive)
      </div>
      <div
        className="relative"
        style={{
          height: '600px',
          transform: 'scale(0.85)',
          transformOrigin: 'top left',
          width: '117.65%', // Compensate for scale
        }}
      >
        <div className="pointer-events-none">
          <DynamicSidebar
            sections={sections}
            collapsed={false}
            mobileOpen={false}
          />
        </div>
      </div>
    </div>
  );
}
