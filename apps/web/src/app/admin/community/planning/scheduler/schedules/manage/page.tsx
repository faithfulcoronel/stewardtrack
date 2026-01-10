/**
 * ================================================================================
 * SCHEDULE MANAGE PAGE
 * ================================================================================
 *
 * Create a new ministry schedule.
 *
 * SECURITY: Protected by AccessGate requiring scheduler:manage permission.
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

import { renderSchedulerPage, type PageSearchParams } from "../../metadata";

type Awaitable<T> = T | Promise<T>;

interface PageProps {
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Create Schedule | StewardTrack",
  description: "Create a new ministry schedule",
};

export default async function ScheduleManagePage({ searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["scheduler:manage"], "any", {
    fallbackPath: "/unauthorized?reason=scheduler_manage_access",
  });

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderSchedulerPage("planning/scheduler/schedules/manage", {
    ...resolvedSearchParams,
  });

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}
