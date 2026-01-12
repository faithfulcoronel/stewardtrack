/**
 * Account Profile Page
 *
 * Display detailed account information with contact and financial details.
 *
 * SECURITY: Protected by AccessGate requiring finance:view permission.
 */

import type { Metadata } from "next";
import { Gate } from "@/lib/access-gate";
import { ProtectedPage } from "@/components/access-gate";
import { getCurrentTenantId, getCurrentUserId } from "@/lib/server/context";

import { renderAccountsPage, type PageSearchParams } from "../metadata";

type Awaitable<T> = T | Promise<T>;

interface PageProps {
  params: Awaitable<{ accountId: string }>;
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Account profile | StewardTrack",
};

export default async function AccountProfilePage({ params, searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["finance:view"], "any", {
    fallbackPath: "/unauthorized?reason=finance_access",
  });

  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams);

  // Merge accountId into searchParams for the metadata renderer
  const mergedSearchParams = {
    ...resolvedSearchParams,
    accountId: resolvedParams.accountId,
  };

  const { content } = await renderAccountsPage("accounts/profile", mergedSearchParams);

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}
