/**
 * Planning Event Manage Page (Add/Edit)
 *
 * Create new calendar events or edit existing event records.
 *
 * SECURITY: Protected by AccessGate requiring members:edit permission.
 */

import type { Metadata } from "next";
import { Gate } from "@/lib/access-gate";
import { ProtectedPage } from "@/components/access-gate";
import { getCurrentTenantId, getCurrentUserId } from "@/lib/server/context";

import { renderPlanningPage, type PageSearchParams } from "../metadata";

type Awaitable<T> = T | Promise<T>;

interface PageProps {
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Manage Event | StewardTrack",
  description: "Create or edit calendar events",
};

export default async function PlanningManagePage({ searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["members:edit"], "any", {
    fallbackPath: "/unauthorized?reason=members_manage",
  });

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderPlanningPage("planning/manage", resolvedSearchParams ?? {});

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10 p-6">{content}</div>
    </ProtectedPage>
  );
}
