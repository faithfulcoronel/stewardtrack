/**
 * ================================================================================
 * SCHEDULER OCCURRENCES LIST PAGE
 * ================================================================================
 *
 * List all schedule occurrences with filters for date, status, and ministry.
 *
 * SECURITY: Protected by AccessGate requiring scheduler:view permission.
 *
 * METADATA ROUTE: admin-community/planning/scheduler/occurrences
 * XML BLUEPRINT: metadata/authoring/blueprints/admin-community/scheduler-occurrences.xml
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
  title: "Occurrences | StewardTrack",
  description: "View and manage scheduled event occurrences",
};

export default async function OccurrencesPage({ searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["scheduler:view"], "any", {
    fallbackPath: "/unauthorized?reason=scheduler_access",
  });

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderSchedulerPage("planning/scheduler/occurrences", resolvedSearchParams ?? {});

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}
