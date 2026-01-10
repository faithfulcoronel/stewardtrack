/**
 * ================================================================================
 * SCHEDULER SCHEDULES LIST PAGE
 * ================================================================================
 *
 * List all ministry schedules with search, filter, and management options.
 *
 * SECURITY: Protected by AccessGate requiring scheduler:view permission.
 *
 * METADATA ROUTE: admin-community/planning/scheduler/schedules
 * XML BLUEPRINT: metadata/authoring/blueprints/admin-community/scheduler-schedules.xml
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
  title: "Schedules | StewardTrack",
  description: "Manage recurring ministry schedules and events",
};

export default async function SchedulesPage({ searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["scheduler:view"], "any", {
    fallbackPath: "/unauthorized?reason=scheduler_access",
  });

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderSchedulerPage("planning/scheduler/schedules", resolvedSearchParams ?? {});

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}
