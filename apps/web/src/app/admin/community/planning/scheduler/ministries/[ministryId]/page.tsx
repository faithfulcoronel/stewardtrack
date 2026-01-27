/**
 * ================================================================================
 * MINISTRY PROFILE PAGE
 * ================================================================================
 *
 * View and manage a specific ministry including team members and schedules.
 *
 * SECURITY: Protected by AccessGate requiring ministries:view permission.
 * @permission ministries:view - Required to view ministry profile
 *
 * METADATA ROUTE: admin-community/planning/scheduler/ministries/profile
 * XML BLUEPRINT: metadata/authoring/blueprints/admin-community/scheduler-ministry-profile.xml
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
  params: Awaitable<{ ministryId: string }>;
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Ministry Profile | StewardTrack",
  description: "View and manage ministry profile, team, and schedules",
};

export default async function MinistryProfilePage({ params, searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["ministries:view"], "any", {
    fallbackPath: "/unauthorized?reason=ministries_access",
  });

  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderSchedulerPage("planning/scheduler/ministries/profile", {
    ...resolvedSearchParams,
    ministryId: resolvedParams.ministryId,
  });

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}
