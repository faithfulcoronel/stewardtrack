/**
 * Household Manage Page (Add/Edit)
 *
 * Create new households or edit existing household records.
 *
 * SECURITY: Protected by AccessGate requiring households:manage permission.
 */

import type { Metadata } from "next";
import { Gate } from "@/lib/access-gate";
import { ProtectedPage } from "@/components/access-gate";
import { getCurrentTenantId, getCurrentUserId } from "@/lib/server/context";

import { renderHouseholdsPage, type PageSearchParams } from "../metadata";

type Awaitable<T> = T | Promise<T>;

interface PageProps {
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Manage household | StewardTrack",
};

export default async function HouseholdsManagePage({ searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission("households:manage", "all", {
    fallbackPath: "/unauthorized?reason=households_manage_required",
  });

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderHouseholdsPage("households/manage", resolvedSearchParams ?? {});

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}
