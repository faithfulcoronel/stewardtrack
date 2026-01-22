"use client";

import { useEffect, useState, useCallback } from "react";
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
  BookOpen,
  CalendarDays,
  Crown,
} from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { UpgradeModal } from "@/components/subscription/UpgradeModal";

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
  calendar: CalendarDays,
} satisfies Record<string, ComponentType<{ className?: string }>>;

type IconKey = keyof typeof ADMIN_NAV_ICONS;

export type AdminNavItem = {
  title: string;
  href: string;
  icon: IconKey;
  badge?: string;
  /** If true, this menu item requires an active subscription (shows crown icon) */
  isPro?: boolean;
};

export type AdminNavSection = {
  label: string;
  items: AdminNavItem[];
};

type AdminSidebarProps = {
  sections: AdminNavSection[];
  collapsed?: boolean;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
};

export function AdminSidebar({
  sections,
  collapsed = false,
  mobileOpen: mobileOpenProp,
  onMobileOpenChange,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const mobileOpen = mobileOpenProp ?? internalMobileOpen;
  const setMobileOpen = onMobileOpenChange ?? setInternalMobileOpen;
  const showLabels = !collapsed;

  // Subscription status for gating pro features
  const { status: subscriptionStatus, isLoading: isSubscriptionLoading } = useSubscriptionStatus();

  // Only show expired state after loading completes to prevent hydration mismatch
  const isSubscriptionExpired = !isSubscriptionLoading && subscriptionStatus.isExpired;
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [blockedFeature, setBlockedFeature] = useState<string>("");

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

  // Handle click on pro feature when subscription is expired
  const handleProItemClick = useCallback(
    (e: React.MouseEvent, item: { title: string; href: string; isPro?: boolean }) => {
      if (item.isPro && isSubscriptionExpired) {
        e.preventDefault();
        setBlockedFeature(item.title);
        setShowUpgradeModal(true);
        setMobileOpen(false);
      }
    },
    [isSubscriptionExpired, setMobileOpen]
  );

  const navSections = sections.map((section) => ({
    ...section,
    items: section.items.map((item) => {
      const Icon = ADMIN_NAV_ICONS[item.icon] ?? LayoutDashboard;
      const target = new URL(item.href, "https://placeholder.local");
      const isActive = pathname === target.pathname;

      return {
        ...item,
        Icon,
        isActive,
      };
    }),
  }));

  return (
    <>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-72 gap-0 overflow-hidden border-r border-white/20 p-0"
          style={{
            background: "var(--sidebar)",
            color: "var(--sidebar-foreground)",
          }}
        >
          <div className="flex items-center gap-3 px-5 pb-5 pt-[max(3rem,calc(var(--safe-area-top)+1rem))]">
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
                      <Link
                        key={item.title + item.href}
                        href={item.href}
                        prefetch={false}
                        title={item.title}
                        onClick={(e) => {
                          handleProItemClick(e, item);
                          if (!item.isPro || !isSubscriptionExpired) {
                            setMobileOpen(false);
                          }
                        }}
                        className={cn(
                          "group flex items-center gap-3 rounded-full px-3 py-2 text-sm font-medium transition",
                          "hover:bg-white/15",
                          item.isActive ? "bg-white/20 text-white" : "text-white/80",
                        )}
                      >
                        <item.Icon className="size-4 flex-none" />
                        <span className="flex-1">{item.title}</span>
                        {item.isPro && isSubscriptionExpired && (
                          <Crown className="size-3.5 flex-none" />
                        )}
                        {item.badge ? (
                          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white">
                            {item.badge}
                          </span>
                        ) : null}
                      </Link>
                    ))}
                  </nav>
                </div>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
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
                    <Link
                      key={item.title + item.href}
                      href={item.href}
                      prefetch={false}
                      title={item.isPro && isSubscriptionExpired ? `${item.title} (Pro)` : item.title}
                      onClick={(e) => handleProItemClick(e, item)}
                      className={cn(
                        "group flex items-center gap-3 rounded-full px-3 py-2 text-sm font-medium transition",
                        "hover:bg-white/15",
                        item.isActive ? "bg-white/20 text-white" : "text-white/80",
                        collapsed && "justify-center",
                      )}
                    >
                      <item.Icon className="size-4 flex-none" />
                      {showLabels && <span className="flex-1">{item.title}</span>}
                      {showLabels && item.isPro && isSubscriptionExpired && (
                        <Crown className="size-3.5 flex-none" />
                      )}
                      {showLabels && item.badge ? (
                        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white">
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  ))}
                </nav>
              </div>
            ))}
          </div>
        </div>
        {showLabels && (
          <div
            className="border-t border-white/20 px-4 py-4 text-xs"
            style={{ color: "color-mix(in srgb, var(--sidebar-foreground) 70%, transparent)" }}
          >
            Copyright {new Date().getFullYear()} StewardTrack
          </div>
        )}
      </aside>

      {/* Upgrade Modal for Pro Features */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        featureName={blockedFeature}
      />
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

