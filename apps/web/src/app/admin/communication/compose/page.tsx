/**
 * ================================================================================
 * COMPOSE MESSAGE PAGE
 * ================================================================================
 *
 * Create and edit communication campaigns with rich text editor and AI assistance.
 *
 * Uses the CampaignComposer component for the main UI.
 *
 * SECURITY: Protected by AccessGate requiring communication:manage permission.
 *
 * ================================================================================
 */

import type { Metadata } from "next";
import { Gate } from "@/lib/access-gate";
import { ProtectedPage } from "@/components/access-gate";
import { getCurrentTenantId, getCurrentUserId } from "@/lib/server/context";

import ComposeClient from "./ComposeClient";

export const metadata: Metadata = {
  title: "Compose Message | Communication | StewardTrack",
  description: "Create and send communication campaigns",
};

export default async function ComposePage() {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["communication:manage"], "any", {
    fallbackPath: "/unauthorized?reason=communication_manage_access",
  });

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <ComposeClient />
    </ProtectedPage>
  );
}
