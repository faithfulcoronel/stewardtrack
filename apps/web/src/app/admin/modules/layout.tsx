/**
 * Modules Protected Layout
 *
 * Applies authenticated access gate to metadata module explorer pages.
 *
 * SECURITY: Protected by AccessGate requiring authentication.
 */

import { ReactNode } from "react";

import { Gate } from "@/lib/access-gate";
import { ProtectedPage } from "@/components/access-gate";
import { getCurrentUserId } from "@/lib/server/context";

export default async function ModulesLayout({ children }: { children: ReactNode }) {
  const userId = await getCurrentUserId();
  const gate = Gate.authenticated({ fallbackPath: "/login" });

  return (
    <ProtectedPage gate={gate} userId={userId}>
      {children}
    </ProtectedPage>
  );
}
