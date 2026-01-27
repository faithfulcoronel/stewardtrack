/**
 * ================================================================================
 * SCHEDULE PROFILE PAGE
 * ================================================================================
 *
 * View schedule details and upcoming occurrences.
 *
 * SECURITY: Protected by AccessGate requiring scheduler:view permission.
 * @permission scheduler:view - Required to view schedule profile
 *
 * METADATA ROUTE: admin-community/scheduler/schedule-profile
 * XML BLUEPRINT: metadata/authoring/blueprints/admin-community/scheduler-schedule-profile.xml
 *
 * ================================================================================
 */

import type { Metadata } from "next";
import { Gate } from "@/lib/access-gate";
import { ProtectedPage } from "@/components/access-gate";
import { getCurrentTenantId, getCurrentUserId } from "@/lib/server/context";

import { renderSchedulerPage, type PageSearchParams } from "../../metadata";

type Awaitable<T> = T | Promise<T>;

interface PageProps {
  params: Awaitable<{ scheduleId: string }>;
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Schedule Profile | StewardTrack",
  description: "View schedule details and upcoming occurrences",
};

export default async function ScheduleProfilePage({ params, searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["scheduler:view"], "any", {
    fallbackPath: "/unauthorized?reason=scheduler_view_access",
  });

  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderSchedulerPage("planning/scheduler/schedules/profile", {
    ...resolvedSearchParams,
    scheduleId: resolvedParams.scheduleId,
  });

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}
