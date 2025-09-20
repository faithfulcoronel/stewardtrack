"use client";

import { useState, type ReactNode } from "react";
import { Bell, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { AdminMobileNav } from "./mobile-nav";
import { AdminSidebar, type AdminNavSection } from "./sidebar-nav";
import { ProfileMenu } from "./profile-menu";

type AdminLayoutShellProps = {
  sections: AdminNavSection[];
  children: ReactNode;
  name: string;
  email: string;
  avatarUrl: string | null;
  planLabel: string;
  logoutAction: () => Promise<void>;
};

export function AdminLayoutShell({
  sections,
  children,
  name,
  email,
  avatarUrl,
  planLabel,
  logoutAction,
}: AdminLayoutShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-muted/10">
      <AdminSidebar sections={sections} collapsed={collapsed} />
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 px-4 py-4 backdrop-blur sm:px-6">
          <div className="flex w-full items-center gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <AdminMobileNav sections={sections} />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="hidden size-10 rounded-full border-border/60 text-muted-foreground shadow-xs lg:ml-1 lg:flex"
                onClick={() => setCollapsed((prev) => !prev)}
              >
                {collapsed ? <ChevronRight className="size-5" /> : <ChevronLeft className="size-5" />}
                <span className="sr-only">{collapsed ? "Expand sidebar" : "Collapse sidebar"}</span>
              </Button>
            </div>
            <div className="ml-auto flex items-center gap-2 sm:gap-3 md:gap-4">
              <Input
                placeholder="Search projects, users..."
                className="hidden h-11 w-44 rounded-full border border-border/60 bg-muted/20 px-4 text-sm sm:block md:w-60"
              />
              <Button
                variant="ghost"
                size="icon"
                className="flex-none rounded-full border border-border/60 text-muted-foreground"
              >
                <Bell className="size-4" />
              </Button>
              <ProfileMenu
                name={name}
                email={email}
                avatarUrl={avatarUrl}
                planLabel={planLabel}
                logoutAction={logoutAction}
              />
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

