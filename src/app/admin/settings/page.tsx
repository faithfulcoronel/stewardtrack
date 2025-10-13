/**
 * Admin Settings Page
 *
 * Configures tenant-level and system-wide administration settings.
 *
 * SECURITY: Protected by AccessGate allowing super admins or tenant admins.
 */

import type { Metadata } from "next";
import { CompositeAccessGate, Gate } from "@/lib/access-gate";
import { ProtectedPage } from "@/components/access-gate";
import { getCurrentTenantId, getCurrentUserId } from "@/lib/server/context";

import { renderAdminSettingsPage, type PageSearchParams } from "./metadata";

type Awaitable<T> = T | Promise<T>;

interface PageProps {
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Admin settings | StewardTrack",
};

export default async function AdminSettingsPage({ searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId({ optional: true });
  const gate = new CompositeAccessGate(
    [
      Gate.superAdminOnly({ fallbackPath: "/unauthorized?reason=super_admin_only" }),
      Gate.withRole("tenant_admin", "any", { fallbackPath: "/unauthorized?reason=tenant_admin_required" }),
    ],
    { requireAll: false, fallbackPath: "/unauthorized?reason=admin_settings" },
  );

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderAdminSettingsPage("settings/overview", resolvedSearchParams ?? {});

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId ?? undefined}>
      <div className="mx-auto w-full max-w-6xl space-y-10 px-4 pb-16 pt-6 sm:px-6 lg:px-8">{content}</div>
    </ProtectedPage>
  );
}
