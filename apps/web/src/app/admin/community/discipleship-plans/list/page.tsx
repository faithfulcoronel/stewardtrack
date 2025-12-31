/**
 * ================================================================================
 * DISCIPLESHIP PLANS LIST PAGE
 * ================================================================================
 *
 * Displays a searchable directory of all discipleship plans for the current tenant.
 * Features filtering by pathway, status, and mentor with quick actions.
 *
 * SECURITY: Protected by AccessGate requiring members:view permission.
 *
 * METADATA ROUTE: admin-community/discipleship-plans/list
 * XML BLUEPRINT: metadata/authoring/blueprints/admin-community/discipleship-plans-list.xml
 *
 * PAGE STRUCTURE (from XML):
 *   - HeroSection: Module header with aggregate metrics
 *   - AdminDataGridSection: Searchable table with filters and row actions
 *
 * SERVICE HANDLERS USED:
 *   - admin-community.discipleship.list.hero
 *   - admin-community.discipleship.list.table
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
  title: "Discipleship plans | StewardTrack",
};

export default async function DiscipleshipPlansListPage({ searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["members:view"], "any", {
    fallbackPath: "/unauthorized?reason=members_access",
  });

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderDiscipleshipPlansPage("discipleship-plans/list", resolvedSearchParams ?? {});

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}
