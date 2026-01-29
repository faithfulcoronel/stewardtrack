/**
 * AI Assistant Page
 *
 * Interactive AI chat interface for church management tasks.
 *
 * SECURITY: Protected by AccessGate requiring:
 * - Feature license: ai_assistant (tenant must have AI feature enabled)
 * - Permission: ai_assistant:access (user must have AI access permission)
 *
 * @module ai.assistant
 * @featureCode ai.assistant
 *
 * @permission ai_assistant:access - Required to access AI Assistant
 */

import type { Metadata } from 'next';
import { Gate, all } from '@/lib/access-gate';
import { ProtectedPage } from '@/components/access-gate';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';

import { AIAssistantClient } from './AIAssistantClient';

export const metadata: Metadata = {
  title: 'AI Assistant | StewardTrack',
  description: 'AI-powered assistant for church management tasks',
};

export default async function AIAssistantPage() {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();

  // Combine feature license check AND permission check
  const gate = all(
    Gate.withLicense('ai.assistant', {
      fallbackPath: '/unauthorized?reason=ai_feature_not_licensed',
    }),
    Gate.withPermission('ai_assistant:access', 'all', {
      fallbackPath: '/unauthorized?reason=ai_access_denied',
    })
  );

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <AIAssistantClient />
    </ProtectedPage>
  );
}
