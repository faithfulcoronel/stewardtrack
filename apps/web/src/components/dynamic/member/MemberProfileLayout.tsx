"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface MemberProfileLayoutProps {
  header: React.ReactNode;
  cards: React.ReactNode;
  sidebar?: React.ReactNode;
  /** User's permission codes for determining sidebar visibility. */
  userPermissions?: string[];
  className?: string;
}

export function MemberProfileLayout({
  header,
  cards,
  sidebar,
  userPermissions = [],
  className,
}: MemberProfileLayoutProps) {
  // Sidebar is shown for staff/admin (users with members:view or members:manage)
  const canViewSidebar = userPermissions.some(p =>
    ["members:view", "members:manage", "members:edit"].includes(p)
  );
  const hasSidebar = !!sidebar && canViewSidebar;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header Section */}
      {header}

      {/* Main Content */}
      <div
        className={cn(
          "grid gap-6",
          hasSidebar
            ? "lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px]"
            : "grid-cols-1"
        )}
      >
        {/* Cards Grid */}
        <div className="space-y-6">
          <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
            {cards}
          </div>
        </div>

        {/* Sidebar (Desktop only, for staff/admin) */}
        {hasSidebar && (
          <aside className="hidden lg:block space-y-6">{sidebar}</aside>
        )}
      </div>
    </div>
  );
}

export default MemberProfileLayout;
