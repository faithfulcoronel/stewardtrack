/**
 * Accounts Dashboard Page
 *
 * Display account statistics, KPIs, and recent activity.
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
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Account Dashboard | StewardTrack",
};

export default async function AccountsDashboardPage({ searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["finance:view"], "any", {
    fallbackPath: "/unauthorized?reason=finance_access",
  });

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderAccountsPage("accounts/dashboard", resolvedSearchParams ?? {});

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}
