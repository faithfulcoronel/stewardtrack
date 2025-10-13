/**
 * Membership Dashboard Page
 *
 * Entry point for member analytics and operational dashboards.
 *
 * SECURITY: Protected by AccessGate requiring members:read or members:write permission.
 */

import type { Metadata } from "next";
import { Gate } from "@/lib/access-gate";
import { ProtectedPage } from "@/components/access-gate";
import { getCurrentTenantId, getCurrentUserId } from "@/lib/server/context";

import { renderMembershipPage, type PageSearchParams } from "./metadata";

type Awaitable<T> = T | Promise<T>;

interface PageProps {
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Membership dashboard | StewardTrack",
};

export default async function MembershipDashboardPage({ searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["members:read", "members:write"], "any", {
    fallbackPath: "/unauthorized?reason=members_access",
  });

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderMembershipPage("members/dashboard", resolvedSearchParams ?? {});

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}