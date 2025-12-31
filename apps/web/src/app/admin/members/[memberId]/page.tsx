/**
 * Member Profile Page
 *
 * Detailed profile view combining engagement, giving, and serving history.
 *
 * SECURITY: Protected by AccessGate requiring members:view or members:manage permission.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Gate } from "@/lib/access-gate";
import { ProtectedPage } from "@/components/access-gate";
import { getCurrentTenantId, getCurrentUserId } from "@/lib/server/context";
import { container } from "@/lib/container";
import { TYPES } from "@/lib/types";
import type { MemberProfileService } from "@/services/MemberProfileService";

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

// UUID v4 regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(str: string): boolean {
  return UUID_REGEX.test(str);
}

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

  // Validate UUID format before database query
  if (!isValidUUID(resolvedParams.memberId)) {
    notFound();
  }

  // Validate that the member exists before rendering the page
  const memberProfileService = container.get<MemberProfileService>(TYPES.MemberProfileService);
  const members = await memberProfileService.getMembers({ memberId: resolvedParams.memberId, limit: 1 });

  if (!members.length) {
    notFound();
  }

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