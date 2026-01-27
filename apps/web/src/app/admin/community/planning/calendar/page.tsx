/**
 * ================================================================================
 * PLANNING CALENDAR PAGE
 * ================================================================================
 *
 * Central calendar view aggregating events from care plans,
 * discipleship plans, and other church activities.
 *
 * SECURITY: Protected by AccessGate requiring members:view permission.
 *
 * METADATA ROUTE: admin-community/planning/calendar
 * XML BLUEPRINT: metadata/authoring/blueprints/admin-community/planning-calendar.xml
 *
 * PAGE STRUCTURE (from XML):
 *   - HeroSection: Calendar header with view controls
 *   - CalendarView: Interactive calendar component
 *   - EventSidebar: Event details and quick actions
 *
 * SERVICE HANDLERS USED:
 *   - admin-community.planning.calendar.hero
 *   - admin-community.planning.calendar.events
 *   - admin-community.planning.calendar.categories
 *
 * ================================================================================
 */

import type { Metadata } from "next";
import { Gate } from "@/lib/access-gate";
import { ProtectedPage } from "@/components/access-gate";
import { getCurrentTenantId, getCurrentUserId } from "@/lib/server/context";

import { renderPlanningPage, type PageSearchParams } from "../metadata";

type Awaitable<T> = T | Promise<T>;

interface PageProps {
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Planning Calendar | StewardTrack",
  description: "Central calendar view for care plans, discipleship, and events",
};

export default async function PlanningCalendarPage({ searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["calendar:view"], "any", {
    fallbackPath: "/unauthorized?reason=calendar_access",
  });

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderPlanningPage("planning/calendar", resolvedSearchParams ?? {});

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}
