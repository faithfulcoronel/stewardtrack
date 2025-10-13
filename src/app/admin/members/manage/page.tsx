/**
 * Manage Member Page
 *
 * Detailed workspace for editing member records and engagement history.
 *
 * SECURITY: Protected by AccessGate requiring members:write permission.
 */

import type { Metadata } from "next";
import { Gate } from "@/lib/access-gate";
import { ProtectedPage } from "@/components/access-gate";
import { getCurrentTenantId, getCurrentUserId } from "@/lib/server/context";

import { renderMembershipPage, type PageSearchParams } from "../metadata";

type Awaitable<T> = T | Promise<T>;

interface PageProps {
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Manage member | StewardTrack",
};

export default async function ManageMemberPage({ searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission("members:write", "all", {
    fallbackPath: "/unauthorized?reason=members_write_required",
  });

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderMembershipPage("members/manage", resolvedSearchParams ?? {});

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}