/**
 * Member Quick Add Lookup Page
 *
 * Guided workflow for quickly locating and creating member records.
 *
 * SECURITY: Protected by AccessGate requiring members:manage permission.
 */

import type { Metadata } from "next";
import { Gate } from "@/lib/access-gate";
import { ProtectedPage } from "@/components/access-gate";
import { getCurrentTenantId, getCurrentUserId } from "@/lib/server/context";

import { renderMembershipPage, type PageSearchParams } from "../../metadata";

type Awaitable<T> = T | Promise<T>;

interface PageProps {
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Quick add lookup | StewardTrack",
};

export default async function LookupQuickCreatePage({ searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission("members:manage", "all", {
    fallbackPath: "/unauthorized?reason=members_write_required",
  });

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderMembershipPage("members/manage/lookup-new", resolvedSearchParams ?? {});

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="min-h-screen bg-muted/30 px-6 py-10">{content}</div>
    </ProtectedPage>
  );
}