/**
 * ================================================================================
 * SCHEDULER CHECK-IN PAGE
 * ================================================================================
 *
 * QR code scanning and manual check-in interface for event attendance.
 *
 * SECURITY: Protected by AccessGate requiring attendance:manage permission.
 * @permission attendance:manage - Required to manage attendance check-ins
 *
 * METADATA ROUTE: admin-community/scheduler/checkin
 * XML BLUEPRINT: metadata/authoring/blueprints/admin-community/scheduler-checkin.xml
 *
 * ================================================================================
 */

import type { Metadata } from "next";
import { Gate } from "@/lib/access-gate";
import { ProtectedPage } from "@/components/access-gate";
import { getCurrentTenantId, getCurrentUserId } from "@/lib/server/context";

import { renderSchedulerPage, type PageSearchParams } from "../metadata";

type Awaitable<T> = T | Promise<T>;

interface PageProps {
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Event Check-In | StewardTrack",
  description: "QR code scanning and manual check-in for event attendance",
};

export default async function CheckInPage({ searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["attendance:manage"], "any", {
    fallbackPath: "/unauthorized?reason=attendance_access",
  });

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderSchedulerPage("planning/scheduler/checkin", resolvedSearchParams ?? {});

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}
