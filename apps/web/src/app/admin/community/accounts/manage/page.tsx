/**
 * Account Manage Page (Add/Edit)
 *
 * Create new accounts or edit existing account records.
 *
 * SECURITY: Protected by AccessGate requiring finance:edit permission.
 */

import type { Metadata } from "next";
import { Gate } from "@/lib/access-gate";
import { ProtectedPage } from "@/components/access-gate";
import { getCurrentTenantId, getCurrentUserId } from "@/lib/server/context";

import { renderAccountsPage, type PageSearchParams } from "../metadata";

type Awaitable<T> = T | Promise<T>;

interface PageProps {
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Manage account | StewardTrack",
};

export default async function AccountsManagePage({ searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["finance:edit"], "any", {
    fallbackPath: "/unauthorized?reason=finance_manage",
  });

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderAccountsPage("accounts/manage", resolvedSearchParams ?? {});

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}
