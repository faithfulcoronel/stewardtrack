/**
 * ================================================================================
 * NEW TEMPLATE PAGE
 * ================================================================================
 *
 * Create a new message template for communication campaigns.
 *
 * SECURITY: Protected by AccessGate requiring communication:manage permission.
 *
 * ================================================================================
 */

import type { Metadata } from 'next';
import { Gate } from "@/lib/access-gate";
import { ProtectedPage } from "@/components/access-gate";
import { getCurrentTenantId, getCurrentUserId } from "@/lib/server/context";
import { TemplateEditor } from '@/components/dynamic/admin/communication/TemplateEditor';

export const metadata: Metadata = {
  title: 'Create Template | Communication | StewardTrack',
  description: 'Create a new message template',
};

export default async function NewTemplatePage() {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["communication:manage"], "any", {
    fallbackPath: "/unauthorized?reason=communication_manage_access",
  });

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <TemplateEditor mode="create" />
      </div>
    </ProtectedPage>
  );
}
