import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Gate } from "@/lib/access-gate";

import { type AdminNavSection } from "@/components/admin/sidebar-nav";
import { AdminLayoutShell } from "@/components/admin/layout-shell";
import { signOut } from "@/lib/auth/actions";
import { container } from "@/lib/container";
import { TYPES } from "@/lib/types";
import type { IMemberRepository } from "@/repositories/member.repository";
import type { TenantService } from "@/services/TenantService";
import type { AuthorizationService } from "@/services/AuthorizationService";

export const dynamic = "force-dynamic";

// Static menu configuration (fallback)
const NAV_SECTIONS: AdminNavSection[] = [
  {
    label: "General",
    items: [
      { title: "Overview", href: "/admin", icon: "dashboard" },
      { title: "My Profile", href: "/admin/my-profile", icon: "customers" },
      // { title: "Announcements", href: "/admin/announcements", icon: "modules" },
      // { title: "Support", href: "/admin/support", icon: "support" },
      // { title: "Documentation", href: "/admin/docs", icon: "docs" },
      // { title: "Modules", href: "/admin/modules", icon: "projects" },
    ],
  },
  {
    label: "Community",
    items: [
      { title: "Members", href: "/admin/members", icon: "customers" },
      { title: "Planning", href: "/admin/community/planning", icon: "calendar" },
    ],
  },
  {
    label: "Financial",
    items: [
      { title: "Financial Overview", href: "/admin/financial-overview", icon: "finances" },
      { title: "Expenses", href: "/admin/expenses", icon: "expenses" },
      { title: "Reports", href: "/admin/reports", icon: "reports" },
    ],
  },
  {
    label: "Administration",
    items: [
      { title: "Security", href: "/admin/security", icon: "security" },
      { title: "Access Control", href: "/admin/security/rbac", icon: "security" },
      { title: "Settings", href: "/admin/settings", icon: "settings" },
    ],
  },
];

// Super admin only sections
const SUPER_ADMIN_SECTIONS: AdminNavSection[] = [
  {
    label: "System Administration",
    items: [
      { title: "Overview", href: "/admin", icon: "dashboard" },
      { title: "Licensing Studio", href: "/admin/licensing", icon: "projects" },
      { title: "System Settings", href: "/admin/system-settings", icon: "settings" },
    ],
  },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check authentication using service layer
  const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
  const authResult = await authService.checkAuthentication();

  if (!authResult.authorized || !authResult.user) {
    // Get the current URL to redirect back after login
    const headersList = await headers();
    const pathname = headersList.get("x-pathname") || headersList.get("x-invoke-path");
    const fullUrl = headersList.get("x-url") || headersList.get("referer");

    // Try to extract the path from available headers
    let redirectTo = "/admin";
    if (pathname && pathname.startsWith("/admin")) {
      redirectTo = pathname;
    } else if (fullUrl) {
      try {
        const url = new URL(fullUrl);
        if (url.pathname.startsWith("/admin")) {
          redirectTo = url.pathname + url.search;
        }
      } catch {
        // Invalid URL, use default
      }
    }

    const loginUrl = redirectTo !== "/admin"
      ? `/login?redirectTo=${encodeURIComponent(redirectTo)}`
      : "/login";
    redirect(loginUrl);
  }

  const user = authResult.user;

  // Get user information using MemberRepository for proper decryption
  const memberRepository = container.get<IMemberRepository>(TYPES.IMemberRepository);
  const memberData = await memberRepository.getCurrentUserMember();

  // Determine display name
  let displayName: string;
  if (memberData?.first_name || memberData?.last_name) {
    displayName = [memberData.first_name, memberData.last_name].filter(Boolean).join(" ");
  } else if (user.user_metadata?.full_name) {
    displayName = user.user_metadata.full_name as string;
  } else if (user.email) {
    displayName = user.email.split("@")[0];
  } else {
    displayName = "Admin";
  }

  const avatarUrl = (user.user_metadata?.avatar_url as string | undefined) ?? null;
  const planLabel = (user.user_metadata?.plan as string | undefined) ?? "Pro";

  // Use AccessGate to determine user role and permissions
  const superAdminGate = Gate.superAdminOnly();
  const isSuperAdmin = await superAdminGate.allows(user.id);

  // Super admins: Only show system administration menu
  // This prevents super admins from accessing tenant-specific sensitive data
  if (isSuperAdmin) {
    return (
      <AdminLayoutShell
        sections={SUPER_ADMIN_SECTIONS}
        name={displayName}
        email={user.email ?? ""}
        avatarUrl={avatarUrl}
        planLabel="Super Admin"
        logoutAction={signOut}
      >
        {children}
      </AdminLayoutShell>
    );
  }

  // Non-super admin users: Require tenant context using service layer
  const tenantService = container.get<TenantService>(TYPES.TenantService);

  let tenantId: string | null = null;
  try {
    const currentTenant = await tenantService.getCurrentTenant();
    tenantId = currentTenant?.id ?? null;
  } catch (error) {
    console.error('Failed to get tenant context:', error);
  }

  if (!tenantId) {
    // No tenant context - redirect to unauthorized
    redirect("/unauthorized?reason=no_tenant");
  }

  // Use static menu system - filter using AccessGate
  const filteredSections = await filterSectionsWithAccessGate(NAV_SECTIONS, user.id, tenantId);

  return (
    <AdminLayoutShell
      sections={filteredSections}
      name={displayName}
      email={user.email ?? ""}
      avatarUrl={avatarUrl}
      planLabel={planLabel}
      logoutAction={signOut}
    >
      {children}
    </AdminLayoutShell>
  );
}

/**
 * Filter menu sections using AccessGate for security
 * This ensures menu items are only shown if user has proper RBAC/license access
 */
async function filterSectionsWithAccessGate(
  sections: AdminNavSection[],
  userId: string,
  tenantId: string
): Promise<AdminNavSection[]> {
  const filteredSections: AdminNavSection[] = [];

  for (const section of sections) {
    const filteredItems = [];

    for (const item of section.items) {
      // Check access based on menu item
      let hasAccess = true;

      // Licensing Studio - super admin only
      if (item.title === 'Licensing Studio') {
        const gate = Gate.superAdminOnly();
        hasAccess = await gate.allows(userId);
      }
      // My Profile - visible to all authenticated users (self-service)
      else if (item.href === '/admin/my-profile') {
        // All authenticated users can view their own profile
        hasAccess = true;
      }
      // Members - requires permission
      else if (item.href.includes('/members')) {
        const gate = Gate.withPermission('members:view');
        hasAccess = await gate.allows(userId, tenantId);
      }
      // Planning - requires members:view permission
      else if (item.href.includes('/community/planning')) {
        const gate = Gate.withPermission('members:view');
        hasAccess = await gate.allows(userId, tenantId);
      }
      // Financial pages - requires permission
      else if (item.href.includes('/financial') || item.href.includes('/expenses')) {
        const gate = Gate.withPermission('finance:read');
        hasAccess = await gate.allows(userId, tenantId);
      }
      // Reports - requires permission
      else if (item.href.includes('/reports')) {
        const gate = Gate.withPermission('reports:read');
        hasAccess = await gate.allows(userId, tenantId);
      }
      // RBAC Management - requires permission
      else if (item.href.includes('/rbac')) {
        const gate = Gate.rbacAdmin();
        hasAccess = await gate.allows(userId, tenantId);
      }
      // Security - requires permission
      else if (item.href.includes('/security')) {
        const gate = Gate.withPermission('security:read');
        hasAccess = await gate.allows(userId, tenantId);
      }
      // Settings - tenant admin or higher
      else if (item.href.includes('/settings')) {
        const gate = Gate.withRole('role_tenant_admin');
        hasAccess = await gate.allows(userId, tenantId);
      }

      if (hasAccess) {
        filteredItems.push(item);
      }
    }

    // Only include section if it has items
    if (filteredItems.length > 0) {
      filteredSections.push({
        ...section,
        items: filteredItems,
      });
    }
  }

  return filteredSections;
}
