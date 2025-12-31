/**
 * Planning Calendar Page
 *
 * Central calendar view aggregating events from care plans,
 * discipleship plans, and other church activities.
 *
 * SECURITY: Protected by AccessGate requiring members:view permission.
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Gate } from "@/lib/access-gate";
import { ProtectedPage } from "@/components/access-gate";
import { getCurrentTenantId, getCurrentUserId } from "@/lib/server/context";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

import { PlanningCalendarContent } from "../PlanningCalendarContent";

export const metadata: Metadata = {
  title: "Planning Calendar | StewardTrack",
  description: "Central calendar view for care plans, discipleship, and events",
};

function CalendarSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <Skeleton className="h-[600px] w-full rounded-xl" />
    </div>
  );
}

export default async function PlanningCalendarPage() {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["members:view"], "any", {
    fallbackPath: "/unauthorized?reason=members_access",
  });

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-8 p-6">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
            <Link href="/admin/community/planning">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Dashboard
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Planning Calendar</h1>
          <p className="text-muted-foreground mt-1">
            Central view for all upcoming events, care plans, and discipleship milestones.
          </p>
        </div>
        <Suspense fallback={<CalendarSkeleton />}>
          <PlanningCalendarContent />
        </Suspense>
      </div>
    </ProtectedPage>
  );
}
