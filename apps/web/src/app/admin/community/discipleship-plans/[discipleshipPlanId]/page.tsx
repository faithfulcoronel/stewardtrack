/**
 * ================================================================================
 * DISCIPLESHIP PLAN PROFILE PAGE
 * ================================================================================
 *
 * Displays detailed information about a specific discipleship plan including
 * pathway, mentor assignment, progress status, and timeline.
 *
 * ROUTE: /admin/community/discipleship-plans/[discipleshipPlanId]
 * Example: /admin/community/discipleship-plans/123e4567-e89b-12d3-a456-426614174000
 *
 * SECURITY: Protected by AccessGate requiring discipleshipplans:view permission.
 *
 * METADATA ROUTE: admin-community/discipleship-plans/profile
 * XML BLUEPRINT: metadata/authoring/blueprints/admin-community/discipleship-plans-profile.xml
 *
 * PAGE STRUCTURE (from XML):
 *   - HeroSection: Member name, pathway, and status metrics
 *   - AdminSummaryPanelsSection: Plan details, timeline, and notes panels
 *
 * SERVICE HANDLERS USED:
 *   - admin-community.discipleship.profile.hero
 *   - admin-community.discipleship.profile.summary
 *
 * URL PARAMS:
 *   - discipleshipPlanId: UUID of the discipleship plan (from dynamic route)
 *
 * ================================================================================
 */

import type { Metadata } from "next";
import { Gate } from "@/lib/access-gate";
import { ProtectedPage } from "@/components/access-gate";
import { getCurrentTenantId, getCurrentUserId } from "@/lib/server/context";

import { renderDiscipleshipPlansPage, type PageSearchParams } from "../metadata";

type Awaitable<T> = T | Promise<T>;

interface PageProps {
  params: Awaitable<{ discipleshipPlanId: string }>;
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Discipleship plan profile | StewardTrack",
};

export default async function DiscipleshipPlanProfilePage({ params, searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["discipleshipplans:view"], "any", {
    fallbackPath: "/unauthorized?reason=discipleship_plans_access",
  });

  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams);

  // Pass discipleshipPlanId from URL to service handlers
  const { content } = await renderDiscipleshipPlansPage("discipleship-plans/profile", {
    ...resolvedSearchParams,
    discipleshipPlanId: resolvedParams.discipleshipPlanId,
  });

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}
