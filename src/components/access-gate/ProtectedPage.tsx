/**
 * ProtectedPage Component
 *
 * Server-side access control for Next.js pages
 */

import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { AccessGate } from '@/lib/access-gate';

interface ProtectedPageProps {
  // Access gate to use for protection
  gate: AccessGate;

  // User ID to check access for
  userId: string;

  // Tenant ID (optional)
  tenantId?: string;

  // Content to render if access is granted
  children: ReactNode;

  // Custom redirect path on denial (overrides gate config)
  redirectTo?: string;
}

/**
 * ProtectedPage - Server component for protecting entire pages
 *
 * @example
 * import { Gate } from '@/lib/access-gate';
 *
 * export default async function AdminPage() {
 *   const userId = await getCurrentUserId();
 *   const gate = Gate.forSurface('admin-panel');
 *
 *   return (
 *     <ProtectedPage gate={gate} userId={userId}>
 *       <AdminDashboard />
 *     </ProtectedPage>
 *   );
 * }
 */
export async function ProtectedPage({
  gate,
  userId,
  tenantId,
  children,
  redirectTo,
}: ProtectedPageProps) {
  const result = await gate.check(userId, tenantId);

  if (!result.allowed) {
    const path = redirectTo || result.redirectTo || '/unauthorized';
    redirect(path);
  }

  return <>{children}</>;
}
