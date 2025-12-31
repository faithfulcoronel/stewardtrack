/**
 * Household List Page
 *
 * Provides searchable household directory with addresses and member information.
 *
 * SECURITY: Protected by AccessGate requiring members:view permission.
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
  title: "Household directory | StewardTrack",
};

export default async function HouseholdsListPage({ searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["members:view"], "any", {
    fallbackPath: "/unauthorized?reason=members_access",
  });

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderHouseholdsPage("households/list", resolvedSearchParams ?? {});

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}
