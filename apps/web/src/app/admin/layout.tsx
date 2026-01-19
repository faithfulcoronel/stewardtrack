import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Gate } from "@/lib/access-gate";

import { type AdminNavSection } from "@/components/admin/sidebar-nav";
import { AdminLayoutShell } from "@/components/admin/layout-shell";
import { GlobalErrorBoundary } from "@/components/error";
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
    ],
  },
  {
    label: "Community",
    items: [
      { title: "Dashboard", href: "/admin/members", icon: "dashboard" },
      { title: "Families", href: "/admin/community/families", icon: "families" },
      { title: "Care Plans", href: "/admin/community/care-plans", icon: "carePlans" },
      { title: "Discipleship Plans", href: "/admin/community/discipleship", icon: "discipleship" },
    ],
  },
  {
    label: "Planning",
    items: [
      { title: "Dashboard", href: "/admin/community/planning", icon: "dashboard" },
      { title: "Calendar", href: "/admin/community/planning/calendar", icon: "calendar" },
      { title: "Scheduler", href: "/admin/community/planning/scheduler", icon: "scheduler" },
      { title: "Goals & Objectives", href: "/admin/community/planning/goals", icon: "goals" },
    ],
  },
  {
    label: "Accounts",
    items: [
      { title: "Dashboard", href: "/admin/community/accounts", icon: "dashboard" },
    ],
  },
  {
    label: "Stewardship",
    items: [
      // Overview & Daily Operations (frequently used)
      { title: "Treasury Overview", href: "/admin/finance", icon: "treasury" },
      { title: "Financial Records", href: "/admin/finance/transactions", icon: "transactions" },
      { title: "Ministry Budgets", href: "/admin/finance/budgets", icon: "ledger" },
      { title: "Financial Reports", href: "/admin/finance/reports", icon: "financialReports" },
    ],
    subGroups: [
      {
        label: "Setup & Configuration",
        icon: "setup",
        defaultCollapsed: true,
        items: [
          // Account Structure
          { title: "Chart of Accounts", href: "/admin/finance/accounts", icon: "chartOfAccounts" },
          { title: "Treasury Accounts", href: "/admin/finance/sources", icon: "expenses" },
          { title: "Ministry Funds", href: "/admin/finance/funds", icon: "funds" },
          { title: "Fiscal Years", href: "/admin/finance/fiscal-years", icon: "calendar" },
          // Categories
          { title: "Giving Categories", href: "/admin/finance/income-categories", icon: "income" },
          { title: "Expense Categories", href: "/admin/finance/expense-categories", icon: "expenseCategories" },
          { title: "Budget Categories", href: "/admin/finance/budget-categories", icon: "categories" },
          // Initial Setup
          { title: "Opening Balances", href: "/admin/finance/opening-balances", icon: "balances" },
        ],
      },
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

  // Prioritize linked member profile picture, fall back to auth metadata
  const avatarUrl = memberData?.profile_picture_url
    ?? (user.user_metadata?.avatar_url as string | undefined)
    ?? null;
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
        <GlobalErrorBoundary>
          {children}
        </GlobalErrorBoundary>
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
      <GlobalErrorBoundary>
        {children}
      </GlobalErrorBoundary>
    </AdminLayoutShell>
  );
}

/**
 * Menu item access configuration
 * Defines which roles can see menu items AND what permissions are required
 * Role check happens first, then permission check
 */
interface MenuAccessConfig {
  // Roles that can access this menu item (any match grants access at role level)
  roles: string[];
  // Permission required (checked after role passes)
  permission?: string;
}

/**
 * Menu access matrix - maps menu paths to role and permission requirements
 * Uses the 11 role personas from the role persona template
 *
 * IMPORTANT: Role keys must match the `metadata_key` in the roles table
 * which has the 'role_' prefix (e.g., 'role_tenant_admin', 'role_senior_pastor')
 */
const MENU_ACCESS_MATRIX: Record<string, MenuAccessConfig> = {
  // General
  '/admin/my-profile': {
    roles: ['role_tenant_admin', 'role_senior_pastor', 'role_associate_pastor', 'role_ministry_leader', 'role_treasurer', 'role_auditor', 'role_secretary', 'role_deacon_elder', 'role_volunteer', 'role_member', 'role_visitor'],
    // No permission required - self-service
  },

  // Community
  '/admin/members': {
    roles: ['role_tenant_admin', 'role_senior_pastor', 'role_associate_pastor', 'role_ministry_leader', 'role_secretary', 'role_deacon_elder'],
    permission: 'members:view',
  },
  '/admin/community/families': {
    roles: ['role_tenant_admin', 'role_senior_pastor', 'role_associate_pastor', 'role_ministry_leader', 'role_secretary'],
    permission: 'households:view',
  },
  '/admin/community/care-plans': {
    roles: ['role_tenant_admin', 'role_senior_pastor', 'role_associate_pastor', 'role_ministry_leader', 'role_deacon_elder'],
    permission: 'care:view',
  },
  '/admin/community/discipleship': {
    roles: ['role_tenant_admin', 'role_senior_pastor', 'role_associate_pastor', 'role_ministry_leader'],
    permission: 'discipleship:view',
  },

  // Planning
  '/admin/community/planning': {
    roles: ['role_tenant_admin', 'role_senior_pastor', 'role_associate_pastor', 'role_ministry_leader', 'role_secretary'],
    permission: 'goals:view',
  },
  '/admin/community/planning/calendar': {
    roles: ['role_tenant_admin', 'role_senior_pastor', 'role_associate_pastor', 'role_ministry_leader', 'role_secretary', 'role_volunteer'],
    permission: 'events:view',
  },
  '/admin/community/planning/scheduler': {
    roles: ['role_tenant_admin', 'role_senior_pastor', 'role_associate_pastor', 'role_ministry_leader', 'role_secretary'],
    permission: 'events:view',
  },
  '/admin/community/planning/goals': {
    roles: ['role_tenant_admin', 'role_senior_pastor', 'role_associate_pastor', 'role_ministry_leader', 'role_deacon_elder'],
    permission: 'goals:view',
  },

  // Accounts
  '/admin/community/accounts': {
    roles: ['role_tenant_admin', 'role_senior_pastor', 'role_treasurer', 'role_auditor', 'role_deacon_elder'],
    permission: 'finance:view',
  },

  // Finance
  '/admin/finance': {
    roles: ['role_tenant_admin', 'role_senior_pastor', 'role_treasurer', 'role_auditor', 'role_deacon_elder'],
    permission: 'finance:view',
  },

  // Administration - Security
  '/admin/security': {
    roles: ['role_tenant_admin', 'role_senior_pastor'],
    permission: 'security:read',
  },
  '/admin/security/rbac': {
    roles: ['role_tenant_admin'],
    // Uses rbacAdmin gate instead of permission
  },

  // Administration - Settings
  '/admin/settings': {
    roles: ['role_tenant_admin'],
    // Tenant admin only
  },
};

/**
 * Check if a menu item has access based on the access matrix
 */
async function checkMenuItemAccess(
  item: { title: string; href: string },
  userId: string,
  tenantId: string
): Promise<boolean> {
  // Special case: Licensing Studio - super admin only
  if (item.title === 'Licensing Studio') {
    const gate = Gate.superAdminOnly();
    return gate.allows(userId);
  }
  // Special case: Overview - visible to all authenticated users
  if (item.href === '/admin') {
    return true;
  }
  // Special case: RBAC - uses composite gate
  if (item.href === '/admin/security/rbac') {
    const gate = Gate.rbacAdmin();
    return gate.allows(userId, tenantId);
  }

  // Use menu access matrix for all other items
  // Find matching config - try exact match first, then prefix match
  let accessConfig = MENU_ACCESS_MATRIX[item.href];

  // For finance sub-pages, use the finance root config
  if (!accessConfig && item.href.startsWith('/admin/finance')) {
    accessConfig = MENU_ACCESS_MATRIX['/admin/finance'];
  }

  if (accessConfig) {
    // Step 1: Role check first
    const roleGate = Gate.withRole(accessConfig.roles, 'any');
    const hasRole = await roleGate.allows(userId, tenantId);

    if (hasRole) {
      // Step 2: Permission check (if specified)
      if (accessConfig.permission) {
        const permissionGate = Gate.withPermission(accessConfig.permission);
        return permissionGate.allows(userId, tenantId);
      }
      // No permission required, role check was sufficient
      return true;
    }
    return false;
  }

  // No config found - default to role_tenant_admin only
  const roleGate = Gate.withRole('role_tenant_admin');
  return roleGate.allows(userId, tenantId);
}

/**
 * Filter menu sections using AccessGate for security
 * Two-layer approach: Role check first, then permission check
 * This ensures menu items are only shown if user has proper role AND permission access
 */
async function filterSectionsWithAccessGate(
  sections: AdminNavSection[],
  userId: string,
  tenantId: string
): Promise<AdminNavSection[]> {
  const filteredSections: AdminNavSection[] = [];

  for (const section of sections) {
    const filteredItems = [];

    // Filter main items
    for (const item of section.items) {
      const hasAccess = await checkMenuItemAccess(item, userId, tenantId);
      if (hasAccess) {
        filteredItems.push(item);
      }
    }

    // Filter sub-groups and their items
    const filteredSubGroups = [];
    if (section.subGroups) {
      for (const subGroup of section.subGroups) {
        const filteredSubGroupItems = [];
        for (const item of subGroup.items) {
          const hasAccess = await checkMenuItemAccess(item, userId, tenantId);
          if (hasAccess) {
            filteredSubGroupItems.push(item);
          }
        }
        // Only include sub-group if it has accessible items
        if (filteredSubGroupItems.length > 0) {
          filteredSubGroups.push({
            ...subGroup,
            items: filteredSubGroupItems,
          });
        }
      }
    }

    // Only include section if it has items or sub-groups with items
    if (filteredItems.length > 0 || filteredSubGroups.length > 0) {
      filteredSections.push({
        ...section,
        items: filteredItems,
        subGroups: filteredSubGroups.length > 0 ? filteredSubGroups : undefined,
      });
    }
  }

  return filteredSections;
}
