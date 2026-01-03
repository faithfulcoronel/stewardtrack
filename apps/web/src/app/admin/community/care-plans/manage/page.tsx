/**
 * Manage Care Plan Page
 *
 * Create or edit care plan records with status, priority, and follow-up scheduling.
 *
 * SECURITY: Protected by AccessGate requiring members:edit permission.
 */

import type { Metadata } from "next";
import { Gate } from "@/lib/access-gate";
import { ProtectedPage } from "@/components/access-gate";
import { getCurrentTenantId, getCurrentUserId } from "@/lib/server/context";

import { renderCarePlansPage, type PageSearchParams } from "../metadata";

type Awaitable<T> = T | Promise<T>;

interface PageProps {
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Manage care plan | StewardTrack",
};

export default async function CarePlanManagePage({ searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["members:edit"], "any", {
    fallbackPath: "/unauthorized?reason=members_manage",
  });

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderCarePlansPage("care-plans/manage", resolvedSearchParams ?? {});

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}
