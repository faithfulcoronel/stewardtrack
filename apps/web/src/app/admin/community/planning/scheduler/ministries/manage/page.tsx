/**
 * ================================================================================
 * MINISTRY MANAGE PAGE
 * ================================================================================
 *
 * Create or edit a ministry with all configuration options.
 *
 * SECURITY: Protected by AccessGate requiring ministries:manage permission.
 *
 * METADATA ROUTE: admin-community/planning/scheduler/ministries/manage
 * XML BLUEPRINT: metadata/authoring/blueprints/admin-community/scheduler-ministry-manage.xml
 *
 * DYNAMIC BEHAVIOR:
 * - When ?ministryId=<id> is present: Edit mode (loads existing ministry)
 * - When ?ministryId is absent: Create mode (empty form)
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
  title: "Manage Ministry | StewardTrack",
  description: "Create or edit ministry details and configuration",
};

export default async function MinistryManagePage({ searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["ministries:manage"], "any", {
    fallbackPath: "/unauthorized?reason=ministries_manage_access",
  });

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderSchedulerPage("planning/scheduler/ministries/manage", {
    ...resolvedSearchParams,
    ministryId: resolvedSearchParams?.ministryId,
  });

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}
