/**
 * Admin Dashboard Page
 *
 * Main dashboard for authenticated administrators.
 *
 * For Super Admins:
 * - Platform-wide overview (all tenants)
 * - System health and metrics
 * - License distribution
 * - Quick access to Licensing Studio and System Settings
 *
 * For Tenant Users (Persona-Based Dashboard):
 * - Role-personalized welcome with church branding
 * - Bible verse of the day with refresh option
 * - "My Focus Today" section with role-specific priorities
 * - Quick actions filtered by role permissions
 * - Church Pulse metrics (leadership roles)
 * - Financial overview (finance roles)
 * - Pastoral care summary (pastoral roles)
 * - Community life (events, celebrations, announcements)
 * - Personal journey tracking (members/visitors/volunteers)
 *
 * SECURITY: Protected by AccessGate requiring authentication.
 * Super admin check determines which dashboard to display.
 */

import type { Metadata } from "next";

import { Gate } from "@/lib/access-gate";
import { ProtectedPage } from "@/components/access-gate";
import { getCurrentUser } from "@/lib/server/context";
import { PersonaBasedDashboard, SuperAdminDashboard } from "@/components/admin/dashboard";

export const metadata: Metadata = {
  title: "Dashboard | StewardTrack",
  description: "Church management dashboard - view members, finances, events, and more",
};

export default async function AdminPage() {
  const user = await getCurrentUser();
  const authGate = Gate.authenticated({ fallbackPath: "/login" });

  // Check if user is a super admin
  const superAdminGate = Gate.superAdminOnly();
  const isSuperAdmin = await superAdminGate.allows(user.id);

  return (
    <ProtectedPage gate={authGate} userId={user.id}>
      {isSuperAdmin ? <SuperAdminDashboard /> : <PersonaBasedDashboard />}
    </ProtectedPage>
  );
}
