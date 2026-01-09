/**
 * My Profile Edit Page - Redirect to Member Manage Form
 *
 * Redirects to the member management form with the current user's member ID.
 * Preserves the section query parameter for tab navigation.
 */

import { redirect } from "next/navigation";
import { container } from "@/lib/container";
import { TYPES } from "@/lib/types";
import { authUtils } from "@/utils/authUtils";
import { tenantUtils } from "@/utils/tenantUtils";
import type { UserMemberLinkRepository } from "@/repositories/userMemberLink.repository";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ section?: string }>;
}

export default async function MyProfileEditPage({ searchParams }: PageProps) {
  const user = await authUtils.getUser();

  if (!user) {
    redirect("/auth/login?redirect=/admin/my-profile");
  }

  const tenantId = await tenantUtils.getTenantId();

  if (!tenantId) {
    redirect("/onboarding");
  }

  // Get the member linked to this user
  const userMemberLinkRepo = container.get<UserMemberLinkRepository>(
    TYPES.UserMemberLinkRepository
  );

  const linkedMember = await userMemberLinkRepo.getMemberByUserId(
    user.id,
    tenantId
  );

  if (!linkedMember) {
    // No linked member, redirect back to profile with error
    redirect("/admin/my-profile");
  }

  // Resolve search params
  const resolvedParams = await searchParams;
  const section = resolvedParams.section;

  // Build redirect URL with optional section parameter
  const baseUrl = `/admin/members/manage?memberId=${linkedMember.id}`;
  const redirectUrl = section ? `${baseUrl}&section=${section}` : baseUrl;

  redirect(redirectUrl);
}
