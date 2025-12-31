"use client";

import { useState, type ReactNode } from "react";
import { Bell, Maximize2, Minimize2, PanelLeftClose, PanelLeftOpen, Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { DynamicSidebar, type DynamicNavSection } from "./DynamicSidebar";
import { ProfileMenu } from "./profile-menu";

type DynamicAdminLayoutShellProps = {
  sections: DynamicNavSection[];
  children: ReactNode;
  name: string;
  email: string;
  avatarUrl: string | null;
  planLabel: string;
  logoutAction: () => Promise<void>;
};

/**
 * DynamicAdminLayoutShell - Layout shell with dynamic menu items
 *
 * Similar to AdminLayoutShell but uses DynamicSidebar with database-driven menu items.
 * Provides the same UI/UX but with access-controlled menu items.
 */
export function DynamicAdminLayoutShell({
  sections,
  children,
  name,
  email,
  avatarUrl,
  planLabel,
  logoutAction,
}: DynamicAdminLayoutShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [isCanvasExpanded, setIsCanvasExpanded] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div
      className={cn(
        "min-h-screen bg-muted/10 transition-[padding-left] duration-300 ease-in-out",
        collapsed ? "lg:pl-20" : "lg:pl-72",
      )}
    >
      <DynamicSidebar
        sections={sections}
        collapsed={collapsed}
        mobileOpen={isMobileSidebarOpen}
        onMobileOpenChange={setIsMobileSidebarOpen}
      />
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 px-4 py-4 backdrop-blur sm:px-6">
          <div className="flex w-full items-center gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-10 rounded-full border-border/60 text-muted-foreground shadow-xs lg:hidden"
                onClick={() => setIsMobileSidebarOpen(true)}
              >
                <Menu className="size-5" />
                <span className="sr-only">Open navigation menu</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="hidden size-10 rounded-full border-border/60 text-muted-foreground shadow-xs lg:ml-1 lg:flex"
                onClick={() => setCollapsed((prev) => !prev)}
              >
                {collapsed ? (
                  <PanelLeftOpen className="size-5" />
                ) : (
                  <PanelLeftClose className="size-5" />
                )}
                <span className="sr-only">{collapsed ? "Expand sidebar" : "Collapse sidebar"}</span>
              </Button>
            </div>
            <div className="ml-auto flex items-center gap-2 sm:gap-3 md:gap-4">
              <Input
                placeholder="Search projects, users..."
                className="hidden h-11 w-44 rounded-full border border-border/60 bg-muted/20 px-4 text-sm sm:block md:w-60"
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="flex-none rounded-full border border-border/60 text-muted-foreground"
                    aria-pressed={isCanvasExpanded}
                    aria-label={
                      isCanvasExpanded
                        ? "Collapse main content width"
                        : "Expand main content to full width"
                    }
                    onClick={() => setIsCanvasExpanded((prev) => !prev)}
                  >
                    {isCanvasExpanded ? (
                      <Minimize2 className="size-4" />
                    ) : (
                      <Maximize2 className="size-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {isCanvasExpanded ? "Collapse width" : "Expand to full width"}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="relative flex-none rounded-full border border-border/60 text-muted-foreground"
                    aria-label="View notifications"
                  >
                    <Bell className="size-4" />
                    <span className="absolute right-1 top-1 block size-2 rounded-full border-2 border-background bg-red-500" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Notifications</TooltipContent>
              </Tooltip>
              <ProfileMenu
                name={name}
                email={email}
                avatarUrl={avatarUrl}
                planLabel={planLabel}
                onLogout={logoutAction}
              />
            </div>
          </div>
        </header>
        <main
          className={cn(
            "flex-1 p-4 sm:p-6",
            isCanvasExpanded ? "container-fluid" : "container max-w-screen-2xl",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
