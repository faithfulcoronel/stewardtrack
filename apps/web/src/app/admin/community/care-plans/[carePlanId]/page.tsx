/**
 * Care Plan Profile Page
 *
 * Displays detailed information about a specific care plan including status, priority,
 * assigned staff, and follow-up schedule.
 *
 * SECURITY: Protected by AccessGate requiring careplans:view permission.
 */

import type { Metadata } from "next";
import { Gate } from "@/lib/access-gate";
import { ProtectedPage } from "@/components/access-gate";
import { getCurrentTenantId, getCurrentUserId } from "@/lib/server/context";

import { renderCarePlansPage, type PageSearchParams } from "../metadata";

type Awaitable<T> = T | Promise<T>;

interface PageProps {
  params: Awaitable<{ carePlanId: string }>;
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Care plan profile | StewardTrack",
};

export default async function CarePlanProfilePage({ params, searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["careplans:view"], "any", {
    fallbackPath: "/unauthorized?reason=care_plans_access",
  });

  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams);

  const { content } = await renderCarePlansPage("care-plans/profile", {
    ...resolvedSearchParams,
    carePlanId: resolvedParams.carePlanId,
  });

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}
