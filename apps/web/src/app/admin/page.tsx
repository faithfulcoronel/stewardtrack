/**
 * Admin Dashboard Page
 *
 * Main dashboard for authenticated administrators displaying:
 * - Welcome message with tenant name
 * - Bible verse of the day
 * - Key metrics (members, finances, events)
 * - Quick action links
 * - Highlights/attention items
 * - Recent activity
 * - Upcoming events and birthdays
 *
 * SECURITY: Protected by AccessGate requiring authentication.
 */

import type { Metadata } from "next";

import { Gate } from "@/lib/access-gate";
import { ProtectedPage } from "@/components/access-gate";
import { getCurrentUser } from "@/lib/server/context";
import { AdminDashboard } from "@/components/admin/dashboard";

export const metadata: Metadata = {
  title: "Dashboard | StewardTrack",
  description: "Church management dashboard - view members, finances, events, and more",
};

export default async function AdminPage() {
  const user = await getCurrentUser();
  const gate = Gate.authenticated({ fallbackPath: "/login" });

  return (
    <ProtectedPage gate={gate} userId={user.id}>
      <AdminDashboard />
    </ProtectedPage>
  );
}
