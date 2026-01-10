/**
 * ================================================================================
 * OCCURRENCE DETAIL PAGE
 * ================================================================================
 *
 * View and manage a specific schedule occurrence including registrations
 * and attendance tracking.
 *
 * SECURITY: Protected by AccessGate requiring scheduler:view permission.
 *
 * METADATA ROUTE: admin-community/scheduler/occurrence-detail
 * XML BLUEPRINT: metadata/authoring/blueprints/admin-community/scheduler-occurrence-detail.xml
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
  params: Awaitable<{ occurrenceId: string }>;
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Event Details | StewardTrack",
  description: "View event details, registrations, and attendance",
};

export default async function OccurrenceDetailPage({ params, searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["scheduler:view"], "any", {
    fallbackPath: "/unauthorized?reason=scheduler_access",
  });

  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderSchedulerPage("planning/scheduler/occurrences/detail", {
    ...resolvedSearchParams,
    occurrenceId: resolvedParams.occurrenceId,
  });

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}
