/**
 * ================================================================================
 * SCHEDULER CALENDAR PAGE
 * ================================================================================
 *
 * Calendar view of all scheduled ministry events and occurrences.
 *
 * SECURITY: Protected by AccessGate requiring scheduler:view permission.
 *
 * METADATA ROUTE: admin-community/scheduler/calendar
 * XML BLUEPRINT: metadata/authoring/blueprints/admin-community/scheduler-calendar.xml
 *
 * ================================================================================
 */

import type { Metadata } from "next";
import { Gate } from "@/lib/access-gate";
import { ProtectedPage } from "@/components/access-gate";
import { getCurrentTenantId, getCurrentUserId } from "@/lib/server/context";

import { renderSchedulerPage, type PageSearchParams } from "../metadata";

type Awaitable<T> = T | Promise<T>;

interface PageProps {
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Schedule Calendar | StewardTrack",
  description: "View ministry schedules and events in calendar format",
};

export default async function SchedulerCalendarPage({ searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["scheduler:view"], "any", {
    fallbackPath: "/unauthorized?reason=scheduler_access",
  });

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderSchedulerPage("planning/scheduler/calendar", resolvedSearchParams ?? {});

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}
