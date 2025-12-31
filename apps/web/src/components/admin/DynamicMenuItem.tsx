"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import { GateGuard } from "@/components/access-gate/GateGuard";
import type { MenuItem } from "@/models/menuItem.model";

interface DynamicMenuItemProps {
  item: MenuItem;
  icon: ComponentType<{ className?: string }>;
  collapsed?: boolean;
  onMobileClick?: () => void;
}

/**
 * DynamicMenuItem - Renders a single menu item with access control
 *
 * Integrates with GateGuard to check access based on surface_id, feature_key, and permission_key.
 * Matches the exact UI/UX of the existing static sidebar.
 */
export function DynamicMenuItem({
  item,
  icon: Icon,
  collapsed = false,
  onMobileClick
}: DynamicMenuItemProps) {
  const pathname = usePathname();

  // Normalize paths for comparison
  const target = new URL(item.path, "https://placeholder.local");
  const isActive = pathname === target.pathname;
  const showLabels = !collapsed;

  // Create access check function for GateGuard
  const checkAccess = async () => {
    try {
      // Call the menu access API endpoint
      const response = await fetch(`/api/menu-items/${item.id}/access-check`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        return {
          allowed: false,
          reason: 'Failed to verify access'
        };
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Access check failed:', error);
      return {
        allowed: false,
        reason: 'Access check error'
      };
    }
  };

  // Don't render if explicitly hidden
  if (!item.is_visible) {
    return null;
  }

  return (
    <GateGuard
      check={checkAccess}
      loading={null} // Don't show loading state for menu items
      fallback={null} // Don't render anything if access is denied
    >
      <Link
        href={item.path}
        prefetch={false}
        title={item.description || item.label}
        onClick={onMobileClick}
        className={cn(
          "group flex items-center gap-3 rounded-full px-3 py-2 text-sm font-medium transition",
          "hover:bg-white/15",
          isActive ? "bg-white/20 text-white" : "text-white/80",
          collapsed && "justify-center",
        )}
      >
        <Icon className="size-4 flex-none" />
        {showLabels && <span className="flex-1">{item.label}</span>}
        {showLabels && item.badge_text ? (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              item.badge_variant === 'primary' && "bg-primary/20 text-primary-foreground",
              item.badge_variant === 'secondary' && "bg-secondary/20 text-secondary-foreground",
              item.badge_variant === 'success' && "bg-green-500/20 text-green-200",
              item.badge_variant === 'warning' && "bg-yellow-500/20 text-yellow-200",
              item.badge_variant === 'danger' && "bg-destructive/20 text-destructive-foreground",
              (!item.badge_variant || item.badge_variant === 'default') && "bg-white/20 text-white"
            )}
          >
            {item.badge_text}
          </span>
        ) : null}
      </Link>
    </GateGuard>
  );
}
