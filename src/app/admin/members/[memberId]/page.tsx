/**
 * Member Profile Page
 *
 * Detailed profile view combining engagement, giving, and serving history.
 *
 * SECURITY: Protected by AccessGate requiring members:read or members:write permission.
 */

import type { Metadata } from "next";
import { Gate } from "@/lib/access-gate";
import { ProtectedPage } from "@/components/access-gate";
import { getCurrentTenantId, getCurrentUserId } from "@/lib/server/context";

import { renderMembershipPage, type PageSearchParams } from "../metadata";

type Awaitable<T> = T | Promise<T>;

interface PageParams {
  memberId: string;
}

interface PageProps {
  params: Awaitable<PageParams>;
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Member profile | StewardTrack",
};

export default async function MemberProfilePage({ params, searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["members:view", "members:manage"], "any", {
    fallbackPath: "/unauthorized?reason=members_access",
  });

  const [resolvedParams, resolvedSearchParams] = await Promise.all([
    Promise.resolve(params),
    Promise.resolve(searchParams),
  ]);

  const aggregatedSearchParams: PageSearchParams = {
    ...resolvedSearchParams,
    memberId: resolvedParams.memberId,
  };

  const { content } = await renderMembershipPage("members/profile", aggregatedSearchParams);

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}