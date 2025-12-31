/**
 * Super Admin System Settings Page
 *
 * System-wide settings for the StewardTrack platform.
 * Configures global integrations (Email, Twilio, Firebase, Webhook) and system templates.
 *
 * SECURITY: Protected by SuperAdminGate - ONLY super admins can access.
 * NOTE: This page does NOT require tenant context.
 */

import type { Metadata } from "next";
import { Gate } from "@/lib/access-gate";
import { ProtectedPage } from "@/components/access-gate";
import { getCurrentUserId } from "@/lib/server/context";

import { renderSuperAdminSettingsPage, type PageSearchParams } from "./metadata";

type Awaitable<T> = T | Promise<T>;

interface PageProps {
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "System Settings | StewardTrack",
  description: "Configure system-wide settings for the StewardTrack platform",
};

export default async function SuperAdminSystemSettingsPage({ searchParams }: PageProps) {
  const userId = await getCurrentUserId();

  // Super admin only - no tenant required
  const gate = Gate.superAdminOnly({
    fallbackPath: "/unauthorized?reason=super_admin_only",
  });

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderSuperAdminSettingsPage("system/overview", resolvedSearchParams ?? {});

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={undefined}>
      <div className="mx-auto w-full max-w-6xl space-y-10 px-4 pb-16 pt-6 sm:px-6 lg:px-8">{content}</div>
    </ProtectedPage>
  );
}
