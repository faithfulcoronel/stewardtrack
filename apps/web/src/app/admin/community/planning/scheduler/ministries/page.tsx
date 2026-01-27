/**
 * ================================================================================
 * SCHEDULER MINISTRY LIST PAGE
 * ================================================================================
 *
 * List and manage ministries with their teams and schedules.
 *
 * SECURITY: Protected by AccessGate requiring ministries:view permission.
 * @permission ministries:view - Required to view ministries list
 *
 * METADATA ROUTE: admin-community/planning/scheduler/ministries/list
 * XML BLUEPRINT: metadata/authoring/blueprints/admin-community/scheduler-ministry-list.xml
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
  title: "Ministries | StewardTrack",
  description: "Manage ministries, teams, and their schedules",
};

export default async function MinistriesPage({ searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["ministries:view"], "any", {
    fallbackPath: "/unauthorized?reason=ministries_access",
  });

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderSchedulerPage("planning/scheduler/ministries/list", resolvedSearchParams ?? {});

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}
