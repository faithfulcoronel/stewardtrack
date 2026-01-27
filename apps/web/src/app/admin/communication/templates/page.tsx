/**
 * ================================================================================
 * TEMPLATES LIST PAGE
 * ================================================================================
 *
 * Manage reusable message templates for communication campaigns.
 *
 * Uses metadata-driven rendering via XML blueprints.
 *
 * SECURITY: Protected by AccessGate requiring communication:view permission.
 *
 * ================================================================================
 */

import type { Metadata } from "next";
import { Gate } from "@/lib/access-gate";
import { ProtectedPage } from "@/components/access-gate";
import { getCurrentTenantId, getCurrentUserId } from "@/lib/server/context";

import { renderCommunicationPage, type PageSearchParams } from "../metadata";

type Awaitable<T> = T | Promise<T>;

interface PageProps {
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Message Templates | Communication | StewardTrack",
  description: "Manage reusable message templates",
};

export default async function TemplatesListPage({ searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["communication:view"], "any", {
    fallbackPath: "/unauthorized?reason=communication_view_access",
  });

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderCommunicationPage("templates", resolvedSearchParams ?? {});

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}
