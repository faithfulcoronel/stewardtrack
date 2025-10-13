import { redirect } from "next/navigation";
import { container } from "@/lib/container";
import { TYPES } from "@/lib/types";
import { Gate } from "@/lib/access-gate";

import { type AdminNavSection } from "@/components/admin/sidebar-nav";
import { AdminLayoutShell } from "@/components/admin/layout-shell";
import { DynamicAdminLayoutShell } from "@/components/admin/DynamicAdminLayoutShell";
import { signOut } from "@/lib/auth/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MenuRenderingService } from "@/services/MenuRenderingService";
import { convertMenuItemsToSections } from "@/lib/menu/menuConverter";

// Static menu configuration (fallback)
const NAV_SECTIONS: AdminNavSection[] = [
  {
    label: "General",
    items: [
      { title: "Overview", href: "/admin", icon: "dashboard" },
      { title: "Announcements", href: "/admin/announcements", icon: "modules" },
      { title: "Support", href: "/admin/support", icon: "support" },
      { title: "Documentation", href: "/admin/docs", icon: "docs" },
      { title: "Modules", href: "/admin/modules", icon: "projects" },
    ],
  },
  {
    label: "Community",
    items: [{ title: "Members", href: "/admin/members", icon: "customers" }],
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
      { title: "RBAC Management", href: "/admin/security/rbac", icon: "security" },
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
      { title: "Menu Builder", href: "/admin/menu-builder", icon: "modules" },
      { title: "System Settings", href: "/admin/settings", icon: "settings" },
    ],
  },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  // Get user information
  const { data: memberData } = await supabase
    .from("members")
    .select("first_name, last_name")
    .eq("user_id", user.id)
    .maybeSingle();

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

  // Non-super admin users: Require tenant context
  const { data: tenantUser } = await supabase
    .from('tenant_users')
    .select('tenant_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!tenantUser) {
    // No tenant context - redirect to unauthorized
    redirect("/unauthorized?reason=no_tenant");
  }

  const tenantId = tenantUser.tenant_id;

  // Check menu strategy: dynamic or static (default: static)
  const menuStrategy = process.env.NEXT_PUBLIC_MENU_STRATEGY || 'static';

  if (menuStrategy === 'dynamic') {
    // Use dynamic menu system with AccessGate filtering
    try {
      const menuRenderingService = container.get<MenuRenderingService>(TYPES.MenuRenderingService);

      // Fetch menu items (already filtered by RBAC + licensing)
      const menuItems = await menuRenderingService.getFlatMenuItems(tenantId, {
        includeHidden: false,
        includeSystem: false,
      });

      // Convert to sections format
      const dynamicSections = convertMenuItemsToSections(menuItems);

      return (
        <DynamicAdminLayoutShell
          sections={dynamicSections}
          name={displayName}
          email={user.email ?? ""}
          avatarUrl={avatarUrl}
          planLabel={planLabel}
          logoutAction={signOut}
        >
          {children}
        </DynamicAdminLayoutShell>
      );
    } catch (error) {
      console.error('Error loading dynamic menu, falling back to static:', error);
      // Fallback to static menu on error
    }
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
      // Menu Builder - super admin only (not in regular menu, but for consistency)
      else if (item.title === 'Menu Builder') {
        const gate = Gate.superAdminOnly();
        hasAccess = await gate.allows(userId);
      }
      // Members - requires permission
      else if (item.href.includes('/members')) {
        const gate = Gate.withPermission('members:read');
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
        const gate = Gate.withRole('tenant_admin');
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
