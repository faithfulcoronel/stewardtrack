/**
 * ================================================================================
 * MANAGE DISCIPLESHIP PLAN PAGE
 * ================================================================================
 *
 * Create or edit discipleship plan records with pathway, mentor, and progress tracking.
 * Mode detection is automatic based on presence of discipleshipPlanId query param.
 *
 * ROUTES:
 *   - CREATE: /admin/community/discipleship-plans/manage
 *   - EDIT:   /admin/community/discipleship-plans/manage?discipleshipPlanId=xxx
 *
 * SECURITY: Protected by AccessGate requiring members:edit permission.
 *
 * METADATA ROUTE: admin-community/discipleship-plans/manage
 * XML BLUEPRINT: metadata/authoring/blueprints/admin-community/discipleship-plans-manage.xml
 *
 * PAGE STRUCTURE (from XML):
 *   - HeroSection: Mode-aware header (Create vs Edit)
 *   - AdminFormSection: Dynamic form with member select, pathway, mentor, etc.
 *
 * SERVICE HANDLERS USED:
 *   - admin-community.discipleship.manage.hero
 *   - admin-community.discipleship.manage.form
 *   - admin-community.discipleship.manage.save (action handler)
 *
 * FORM FLOW:
 *   1. User fills form fields
 *   2. Submit triggers save action handler
 *   3. On success, navigates to profile page with toast notification
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
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Manage discipleship plan | StewardTrack",
};

export default async function DiscipleshipPlanManagePage({ searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["members:edit"], "any", {
    fallbackPath: "/unauthorized?reason=members_manage",
  });

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderDiscipleshipPlansPage("discipleship-plans/manage", resolvedSearchParams ?? {});

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}
