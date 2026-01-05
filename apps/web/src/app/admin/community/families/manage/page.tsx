/**
 * Family Manage Page
 *
 * Create or edit family records with address and notes.
 *
 * SECURITY: Protected by AccessGate requiring members:edit permission.
 */

import type { Metadata } from "next";
import { Gate } from "@/lib/access-gate";
import { ProtectedPage } from "@/components/access-gate";
import { getCurrentTenantId, getCurrentUserId } from "@/lib/server/context";

import { renderFamiliesPage, type PageSearchParams } from "../metadata";

type Awaitable<T> = T | Promise<T>;

interface PageProps {
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Manage family | StewardTrack",
};

export default async function FamilyManagePage({ searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["members:edit"], "any", {
    fallbackPath: "/unauthorized?reason=members_edit_access",
  });

  const resolvedSearchParams = await Promise.resolve(searchParams);

  // Extract familyId from searchParams for edit mode
  const familyId = resolvedSearchParams?.familyId as string | undefined;

  const { content } = await renderFamiliesPage("families/manage", {
    ...resolvedSearchParams,
    ...(familyId ? { id: familyId, familyId } : {}),
  });

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}
