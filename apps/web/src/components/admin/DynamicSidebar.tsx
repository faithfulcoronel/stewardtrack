"use client";

import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  Users2,
  Settings,
  LifeBuoy,
  ShieldCheck,
  FileChartColumn,
  Wallet,
  Briefcase,
  Blocks,
  Layers,
  BookOpen
} from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { MenuItem } from "@/models/menuItem.model";
import { DynamicMenuItem } from "./DynamicMenuItem";

// Icon registry matching the existing sidebar
export const ADMIN_NAV_ICONS = {
  dashboard: LayoutDashboard,
  reports: BarChart3,
  customers: Users2,
  settings: Settings,
  support: LifeBuoy,
  security: ShieldCheck,
  finances: FileChartColumn,
  expenses: Wallet,
  projects: Briefcase,
  uiBlocks: Blocks,
  modules: Layers,
  docs: BookOpen,
} satisfies Record<string, ComponentType<{ className?: string }>>;

type IconKey = keyof typeof ADMIN_NAV_ICONS;

export type DynamicNavSection = {
  label: string;
  items: MenuItem[];
};

type DynamicSidebarProps = {
  sections: DynamicNavSection[];
  collapsed?: boolean;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
};

/**
 * DynamicSidebar - Renders menu items from database with access control
 *
 * Matches the exact UI/UX of the existing AdminSidebar component but uses
 * dynamic menu items from the database with GateGuard access control.
 */
export function DynamicSidebar({
  sections,
  collapsed = false,
  mobileOpen: mobileOpenProp,
  onMobileOpenChange,
}: DynamicSidebarProps) {
  const pathname = usePathname();
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const mobileOpen = mobileOpenProp ?? internalMobileOpen;
  const setMobileOpen = onMobileOpenChange ?? setInternalMobileOpen;
  const showLabels = !collapsed;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");

    if (mediaQuery.matches) {
      setMobileOpen(false);
    }

    const handler = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setMobileOpen(false);
      }
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }

    mediaQuery.addListener(handler);
    return () => mediaQuery.removeListener(handler);
  }, [setMobileOpen]);

  // Resolve icons for each menu item
  const navSections = sections.map((section) => ({
    ...section,
    items: section.items.map((item) => {
      const Icon = ADMIN_NAV_ICONS[item.icon as IconKey] ?? LayoutDashboard;
      return {
        ...item,
        Icon,
      };
    }),
  }));

  const handleMobileClick = () => {
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-72 gap-0 overflow-hidden border-r border-white/20 p-0"
          style={{
            background: "var(--sidebar)",
            color: "var(--sidebar-foreground)",
          }}
        >
          <div className="flex items-center gap-3 px-5 pb-5 pt-12">
            <SidebarBrand showLabels className="gap-3" />
          </div>
          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-8 px-4 pb-10">
              {navSections.map((section) => (
                <div key={section.label} className="space-y-2">
                  <p
                    className="px-1 text-[11px] font-semibold uppercase tracking-[0.2em]"
                    style={{ color: "color-mix(in srgb, var(--sidebar-foreground) 70%, transparent)" }}
                  >
                    {section.label}
                  </p>
                  <nav className="grid gap-1">
                    {section.items.map((item) => (
                      <DynamicMenuItem
                        key={item.id}
                        item={item}
                        icon={item.Icon}
                        collapsed={false}
                        onMobileClick={handleMobileClick}
                      />
                    ))}
                  </nav>
                </div>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 hidden flex-col border-r border-border/10 shadow-xl transition-[width] duration-300 lg:flex z-30",
          collapsed ? "w-20" : "w-72",
        )}
        style={{
          background: "var(--sidebar)",
          color: "var(--sidebar-foreground)",
        }}
      >
        <SidebarBrand showLabels={showLabels} className="gap-3 px-5 py-6" />
        <div className="sidebar-scroll flex-1 overflow-y-auto px-3 pb-8">
          <div className="space-y-8">
            {navSections.map((section) => (
              <div key={section.label} className="space-y-2">
                {showLabels && (
                  <p
                    className="px-2 text-[11px] font-semibold uppercase tracking-[0.2em]"
                    style={{ color: "color-mix(in srgb, var(--sidebar-foreground) 70%, transparent)" }}
                  >
                    {section.label}
                  </p>
                )}
                <nav className="grid gap-1">
                  {section.items.map((item) => (
                    <DynamicMenuItem
                      key={item.id}
                      item={item}
                      icon={item.Icon}
                      collapsed={collapsed}
                    />
                  ))}
                </nav>
              </div>
            ))}
          </div>
        </div>
        <div
          className="border-t border-white/20 px-4 py-4 text-xs"
          style={{ color: "color-mix(in srgb, var(--sidebar-foreground) 70%, transparent)" }}
        >
          Copyright {new Date().getFullYear()} StewardTrack
        </div>
      </aside>
    </>
  );
}

function SidebarBrand({ showLabels, className }: { showLabels?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center", className)}>
      <Link
        href="/"
        className="flex size-11 items-center justify-center text-base font-semibold text-[color:var(--sidebar-primary-foreground)] shadow-lg shadow-black/10"
      >
        <div className="flex items-center">
          <Image
            src="/logo_square.svg"
            alt="StewardTrack Logo"
            width={40}
            height={40}
            className="h-8 w-8 sm:h-10 sm:w-10"
            priority
          />
        </div>
      </Link>
      {showLabels && (
        <div className="ml-3 leading-tight">
          <p className="text-lg font-semibold" style={{ color: "var(--sidebar-foreground)" }}>
            StewardTrack
          </p>
          <p className="text-xs/5" style={{ color: "color-mix(in srgb, var(--sidebar-foreground) 60%, transparent)" }}>
            Control center
          </p>
        </div>
      )}
    </div>
  );
}
