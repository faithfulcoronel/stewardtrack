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
import type { MemberService } from "@/services/MemberService";
import type { MembershipTypeService } from "@/services/MembershipTypeService";
import type { MembershipStageService } from "@/services/MembershipStageService";

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
      { title: "Accounts", href: "/admin/community/accounts", icon: "finances" },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Dashboard", href: "/admin/finance", icon: "finances" },
      { title: "Chart of Accounts", href: "/admin/finance/accounts", icon: "finances" },
      { title: "Income Sources", href: "/admin/finance/sources", icon: "expenses" },
      { title: "Transactions", href: "/admin/finance/transactions", icon: "expenses" },
      { title: "Budgets", href: "/admin/finance/budgets", icon: "finances" },
      { title: "Fiscal Years", href: "/admin/finance/fiscal-years", icon: "calendar" },
      { title: "Funds", href: "/admin/finance/funds", icon: "finances" },
      { title: "Income Categories", href: "/admin/finance/income-categories", icon: "expenses" },
      { title: "Expense Categories", href: "/admin/finance/expense-categories", icon: "expenses" },
      { title: "Budget Categories", href: "/admin/finance/budget-categories", icon: "finances" },
      { title: "Opening Balances", href: "/admin/finance/opening-balances", icon: "finances" },
      { title: "Reports", href: "/admin/finance/reports", icon: "reports" },
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
    // x-url header is set by middleware and includes pathname + query string
    const headersList = await headers();
    const currentUrl = headersList.get("x-url");
    const pathname = headersList.get("x-pathname");

    // Determine the redirect destination
    let redirectTo = "/admin";
    if (currentUrl && currentUrl.startsWith("/admin")) {
      // Prefer x-url as it includes query parameters
      redirectTo = currentUrl;
    } else if (pathname && pathname.startsWith("/admin")) {
      // Fall back to pathname without query params
      redirectTo = pathname;
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

  // Check if tenant setup is complete and run recovery if needed
  // This ensures features, permissions, and role assignments are properly configured
  // even if the async registration tasks failed or were interrupted
  try {
    const setupResult = await tenantService.ensureSetupComplete(tenantId, user.id);

    if (!setupResult.success) {
      console.warn('[AdminLayout] Tenant setup check returned non-success:', setupResult);
    } else if (setupResult.featuresAdded > 0 || setupResult.permissionsDeployed > 0) {
      console.log('[AdminLayout] Tenant setup auto-recovery completed:', {
        featuresAdded: setupResult.featuresAdded,
        permissionsDeployed: setupResult.permissionsDeployed,
        roleAssignmentsCreated: setupResult.roleAssignmentsCreated,
      });
    }
  } catch (setupError) {
    // Log but don't block - user can still use the app even if setup check fails
    console.error('[AdminLayout] Failed to check/complete tenant setup:', setupError);
  }

  // Create member profile for tenant admin if not exists (part of registration recovery)
  // This only applies to the user who created the tenant (tenant admin during registration)
  // Other users should have member profiles created through the normal member management flow
  // Uses admin_member_created flag to prevent duplicate attempts
  try {
    // Check if current user is the tenant creator (tenant admin from registration)
    const tenant = await tenantService.findById(tenantId);

    // Only process if: user is tenant creator AND admin member flag hasn't been set yet
    if (tenant && tenant.created_by === user.id && !tenant.admin_member_created) {
      const memberService = container.get<MemberService>(TYPES.MemberService);

      // Double-check: Look for any existing member linked to this user_id in this tenant
      // This prevents duplicates for existing tenants where flag wasn't set
      // IMPORTANT: Must include tenant_id filter for RLS policy to work correctly
      const existingMembersResult = await memberService.findAll({
        filters: {
          tenant_id: { operator: 'eq', value: tenantId },
          user_id: { operator: 'eq', value: user.id },
        },
      });
      const existingMembers = existingMembersResult.data || [];

      if (existingMembers.length > 0) {
        // Member already exists - just update the flag
        console.log(`[AdminLayout] Found existing member ${existingMembers[0].id} for tenant admin ${user.id}, updating flag`);
        await tenantService.markAdminMemberCreated(tenantId);
      } else if (!memberData) {
        // No member exists - create one
        const membershipTypeService = container.get<MembershipTypeService>(TYPES.MembershipTypeService);
        const membershipStageService = container.get<MembershipStageService>(TYPES.MembershipStageService);

        // Get default membership type and stage (seeded during onboarding)
        const membershipTypes = await membershipTypeService.getActive();
        const membershipStages = await membershipStageService.getActive();

        if (membershipTypes.length > 0 && membershipStages.length > 0) {
          const firstName = (user.user_metadata?.first_name as string) || user.email?.split('@')[0] || 'User';
          const lastName = (user.user_metadata?.last_name as string) || '';

          const newMember = await memberService.create({
            tenant_id: tenantId,
            first_name: firstName,
            last_name: lastName,
            email: user.email || undefined,
            membership_type_id: membershipTypes[0].id,
            membership_status_id: membershipStages[0].id,
            membership_date: new Date().toISOString().split('T')[0],
            gender: 'other',
            marital_status: 'single',
            user_id: user.id,
            linked_at: new Date().toISOString(),
          });

          console.log(`[AdminLayout] Created member profile ${newMember.id} for tenant admin ${user.id}`);

          // Mark admin member as created to prevent duplicate attempts
          await tenantService.markAdminMemberCreated(tenantId);

          // Update displayName with new member data
          displayName = [firstName, lastName].filter(Boolean).join(' ') || displayName;
        } else {
          console.warn('[AdminLayout] Cannot create member: no active membership types/stages found');
        }
      }
    }
  } catch (memberError) {
    // Log but don't block - user can still use the app
    console.error('[AdminLayout] Failed to create/check member profile:', memberError);
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
      // Accounts - requires finance:view permission
      else if (item.href.includes('/community/accounts')) {
        const gate = Gate.withPermission('finance:view');
        hasAccess = await gate.allows(userId, tenantId);
      }
      // Finance module - requires finance:view permission
      else if (item.href.startsWith('/admin/finance')) {
        const gate = Gate.withPermission('finance:view');
        hasAccess = await gate.allows(userId, tenantId);
      }
      // Legacy financial pages - requires permission
      else if (item.href.includes('/financial') || item.href.includes('/expenses')) {
        const gate = Gate.withPermission('finance:read');
        hasAccess = await gate.allows(userId, tenantId);
      }
      // Reports - requires permission
      else if (item.href.includes('/reports') && !item.href.startsWith('/admin/finance')) {
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
