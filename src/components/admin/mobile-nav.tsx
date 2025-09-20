"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { ADMIN_NAV_ICONS, type AdminNavSection } from "./sidebar-nav";

export function AdminMobileNav({ sections }: { sections: AdminNavSection[] }) {
  const pathname = usePathname();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-10 rounded-full border-border/60 text-muted-foreground shadow-xs lg:hidden"
        >
          <Menu className="size-5" />
          <span className="sr-only">Open navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-72 gap-0 overflow-hidden border-r border-white/20 bg-[color:var(--sidebar)] p-0 text-[color:var(--sidebar-foreground)]"
      >
        <div className="flex items-center gap-3 px-5 pb-5 pt-12">
          <Link
            href="/"
            className="flex size-11 items-center justify-center rounded-2xl bg-[color:var(--sidebar-foreground)] text-base font-semibold text-[color:var(--sidebar-primary-foreground)] shadow-lg shadow-black/10"
          >
            FS
          </Link>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Flowspace Admin</p>
            <p className="text-xs/5" style={{ color: "color-mix(in srgb, var(--sidebar-foreground) 70%, transparent)" }}>
              Control center
            </p>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-8 px-4 pb-10">
            {sections.map((section) => (
              <div key={section.label} className="space-y-2">
                <p
                  className="px-1 text-[11px] font-semibold uppercase tracking-[0.2em]"
                  style={{ color: "color-mix(in srgb, var(--sidebar-foreground) 70%, transparent)" }}
                >
                  {section.label}
                </p>
                <div className="grid gap-1">
                  {section.items.map((item) => {
                    const Icon = ADMIN_NAV_ICONS[item.icon] ?? ADMIN_NAV_ICONS.dashboard;
                    const target = new URL(item.href, "https://placeholder.local");
                    const isActive = pathname === target.pathname;

                    return (
                      <SheetClose asChild key={item.title + item.href}>
                        <Link
                          href={item.href}
                          prefetch={false}
                          className={cn(
                            "group flex items-center gap-3 rounded-full px-3 py-2 text-sm font-medium transition",
                            "hover:bg-white/15",
                            isActive ? "bg-white/20 text-white" : "text-white/80",
                          )}
                        >
                          <Icon className="size-4 flex-none" />
                          <span className="flex-1">{item.title}</span>
                          {item.badge ? (
                            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white">
                              {item.badge}
                            </span>
                          ) : null}
                        </Link>
                      </SheetClose>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
