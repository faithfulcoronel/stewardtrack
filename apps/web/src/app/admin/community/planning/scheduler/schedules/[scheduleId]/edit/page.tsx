/**
 * ================================================================================
 * SCHEDULE EDIT PAGE
 * ================================================================================
 *
 * Edit an existing ministry schedule.
 *
 * SECURITY: Protected by AccessGate requiring scheduler:manage permission.
 * @permission scheduler:manage - Required to edit schedules
 *
 * METADATA ROUTE: admin-community/planning/scheduler/schedules/manage
 * XML BLUEPRINT: metadata/authoring/blueprints/admin-community/scheduler-schedule-manage.xml
 *
 * ================================================================================
 */

import type { Metadata } from "next";
import { Gate } from "@/lib/access-gate";
import { ProtectedPage } from "@/components/access-gate";
import { getCurrentTenantId, getCurrentUserId } from "@/lib/server/context";

import { renderSchedulerPage, type PageSearchParams } from "../../../metadata";

type Awaitable<T> = T | Promise<T>;

interface PageProps {
  params: Awaitable<{ scheduleId: string }>;
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Edit Schedule | StewardTrack",
  description: "Edit ministry schedule details and configuration",
};

export default async function ScheduleEditPage({ params, searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["scheduler:manage"], "any", {
    fallbackPath: "/unauthorized?reason=scheduler_manage_access",
  });

  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderSchedulerPage("planning/scheduler/schedules/manage", {
    ...resolvedSearchParams,
    scheduleId: resolvedParams.scheduleId,
  });

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}
