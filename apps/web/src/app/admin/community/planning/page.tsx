/**
 * Planning Dashboard Page
 *
 * Central hub for church planning activities including calendar,
 * goals tracking, and attendance management.
 *
 * SECURITY: Protected by AccessGate requiring members:view permission.
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import { Gate } from "@/lib/access-gate";
import { ProtectedPage } from "@/components/access-gate";
import { getCurrentTenantId, getCurrentUserId } from "@/lib/server/context";
import { Skeleton } from "@/components/ui/skeleton";

import { PlanningDashboardContent } from "./PlanningDashboardContent";

export const metadata: Metadata = {
  title: "Planning Dashboard | StewardTrack",
  description: "Central hub for church planning, calendar, goals, and attendance",
};

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default async function PlanningDashboardPage() {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["members:view"], "any", {
    fallbackPath: "/unauthorized?reason=members_access",
  });

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-8 p-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Planning Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Central hub for church planning, calendar management, and goal tracking.
          </p>
        </div>

        {/* Dashboard Content */}
        <Suspense fallback={<DashboardSkeleton />}>
          <PlanningDashboardContent />
        </Suspense>
      </div>
    </ProtectedPage>
  );
}
