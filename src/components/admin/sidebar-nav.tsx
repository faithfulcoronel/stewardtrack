"use client";

import Link from "next/link";
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
  Layers
} from "lucide-react";

import { cn } from "@/lib/utils";

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
} satisfies Record<string, React.ComponentType<{ className?: string }>>;

type IconKey = keyof typeof ADMIN_NAV_ICONS;

export type AdminNavItem = {
  title: string;
  href: string;
  icon: IconKey;
  badge?: string;
};

export type AdminNavSection = {
  label: string;
  items: AdminNavItem[];
};

export function AdminSidebar({
  sections,
  collapsed = false,
}: {
  sections: AdminNavSection[];
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const showLabels = !collapsed;

  return (
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
      <div className="flex items-center gap-3 px-5 py-6">
        <Link
          href="/"
          className="flex size-11 items-center justify-center rounded-2xl bg-[color:var(--sidebar-foreground)] text-base font-semibold text-[color:var(--sidebar-primary-foreground)] shadow-lg shadow-black/10"
        >
          FS
        </Link>
        {showLabels && (
          <div className="leading-tight">
            <p className="text-sm font-semibold" style={{ color: "var(--sidebar-foreground)" }}>
              Flowspace Admin
            </p>
            <p className="text-xs/5" style={{ color: "color-mix(in srgb, var(--sidebar-foreground) 60%, transparent)" }}>
              Control center
            </p>
          </div>
        )}
      </div>
      <div className="sidebar-scroll flex-1 overflow-y-auto px-3 pb-8">
        <div className="space-y-8">
          {sections.map((section) => (
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
                {section.items.map((item) => {
                  const Icon = ADMIN_NAV_ICONS[item.icon] ?? LayoutDashboard;
                  const target = new URL(item.href, "https://placeholder.local");
                  const isActive = pathname === target.pathname;
                  return (
                    <Link
                      key={item.title + item.href}
                      href={item.href}
                      prefetch={false}
                      title={item.title}
                      className={cn(
                        "group flex items-center gap-3 rounded-full px-3 py-2 text-sm font-medium transition",
                        "hover:bg-white/15",
                        isActive ? "bg-white/20 text-white" : "text-white/80",
                        collapsed && "justify-center",
                      )}
                    >
                      <Icon className="size-4 flex-none" />
                      {showLabels && <span className="flex-1">{item.title}</span>}
                      {showLabels && item.badge ? (
                        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white">
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </div>
      <div
        className="border-t border-white/20 px-4 py-4 text-xs"
        style={{ color: "color-mix(in srgb, var(--sidebar-foreground) 70%, transparent)" }}
      >
        Copyright {new Date().getFullYear()} Flowspace
      </div>
    </aside>
  );
}

