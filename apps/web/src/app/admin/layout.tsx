import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getUserRoles, getUserPermissionCodes, checkSuperAdmin } from "@/lib/rbac/permissionHelpers";

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

// Force dynamic rendering for all admin routes since authentication requires cookies
export const dynamic = 'force-dynamic';

// Static menu configuration (fallback)
const NAV_SECTIONS: AdminNavSection[] = [
  {
    label: "General",
    items: [
      { title: "Overview", href: "/admin", icon: "dashboard" },
      { title: "My Profile", href: "/admin/my-profile", icon: "customers" },
      { title: "AI Assistant", href: "/admin/ai-assistant", icon: "aiAssistant" },
    ],
  },
  {
    label: "Community",
    items: [
      { title: "Dashboard", href: "/admin/members", icon: "dashboard" },
      { title: "Reports", href: "/admin/community/reports", icon: "reports" },
      { title: "Families", href: "/admin/community/families", icon: "families" },
      { title: "Care Plans", href: "/admin/community/care-plans", icon: "carePlans" },
      { title: "Discipleship Plans", href: "/admin/community/discipleship-plans", icon: "discipleship" },
    ],
  },
  {
    label: "Planning",
    items: [
      { title: "Dashboard", href: "/admin/community/planning", icon: "dashboard" },
      { title: "Calendar", href: "/admin/community/planning/calendar", icon: "calendar" },
      { title: "Scheduler", href: "/admin/community/planning/scheduler", icon: "scheduler" },
      { title: "Goals & Objectives", href: "/admin/community/planning/goals", icon: "goals" },
      { title: "Notebooks", href: "/admin/community/planning/notebooks", icon: "notebooks" },
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
      { title: "Online Donations", href: "/admin/finance/donations", icon: "giving" },
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

  // PERFORMANCE OPTIMIZATION: Parallelize initial data fetching
  // These operations are independent and can run concurrently
  const memberRepository = container.get<IMemberRepository>(TYPES.IMemberRepository);
  const tenantService = container.get<TenantService>(TYPES.TenantService);

  const [memberData, isSuperAdmin, currentTenant] = await Promise.all([
    memberRepository.getCurrentUserMember(),
    checkSuperAdmin(),
    tenantService.getCurrentTenant().catch((error) => {
      console.error('Failed to get tenant context:', error);
      return null;
    }),
  ]);

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

  // Non-super admin users: Require tenant context
  const tenantId = currentTenant?.id ?? null;

  if (!tenantId) {
    // No tenant context - redirect to unauthorized
    redirect("/unauthorized?reason=no_tenant");
  }

  // PERFORMANCE OPTIMIZATION: Run tenant setup check and fetch user permissions in parallel
  // The setup check is a recovery mechanism that runs in the background
  // The permissions/roles fetch is needed for menu filtering
  const [_setupResult, userRoles, userPermissions, tenant] = await Promise.all([
    // Tenant setup check (non-blocking, just logs)
    tenantService.ensureSetupComplete(tenantId, user.id)
      .then((result) => {
        if (!result.success) {
          console.warn('[AdminLayout] Tenant setup check returned non-success:', result);
        } else if (result.featuresAdded > 0 || result.permissionsDeployed > 0) {
          console.log('[AdminLayout] Tenant setup auto-recovery completed:', {
            featuresAdded: result.featuresAdded,
            permissionsDeployed: result.permissionsDeployed,
            roleAssignmentsCreated: result.roleAssignmentsCreated,
          });
        }
        return result;
      })
      .catch((error) => {
        console.error('[AdminLayout] Failed to check/complete tenant setup:', error);
        return null;
      }),
    // PERFORMANCE: Fetch all user roles once for menu filtering
    getUserRoles(user.id, tenantId),
    // PERFORMANCE: Fetch all user permissions once for menu filtering
    getUserPermissionCodes(user.id, tenantId),
    // Fetch tenant for member creation check
    tenantService.findById(tenantId),
  ]);

  // Create member profile for tenant admin if not exists (part of registration recovery)
  // This only applies to the user who created the tenant (tenant admin during registration)
  // Other users should have member profiles created through the normal member management flow
  // Uses admin_member_created flag to prevent duplicate attempts
  try {
    // Check if current user is the tenant creator (tenant admin from registration)

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

  // PERFORMANCE OPTIMIZATION: Use batched roles/permissions for menu filtering
  // This avoids 80+ individual database queries by checking against cached data
  const filteredSections = filterSectionsWithCachedAccess(NAV_SECTIONS, userRoles, userPermissions);

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
  '/admin/community/discipleship-plans': {
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
  '/admin/community/planning/notebooks': {
    roles: ['role_tenant_admin', 'role_senior_pastor', 'role_associate_pastor', 'role_ministry_leader', 'role_treasurer', 'role_auditor', 'role_secretary', 'role_deacon_elder', 'role_volunteer'],
    permission: 'members:view',
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

  // Administration - AI Assistant
  '/admin/ai-assistant': {
    roles: ['role_tenant_admin', 'role_senior_pastor', 'role_associate_pastor', 'role_ministry_leader', 'role_secretary'],
    // Feature flag checked at page level via metadata RequiresFeature
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
 * PERFORMANCE OPTIMIZED: Check menu item access using cached roles/permissions
 * This is synchronous and does NOT make any database queries
 */
function checkMenuItemAccessCached(
  item: { title: string; href: string },
  userRoles: string[],
  userPermissions: string[]
): boolean {
  // Special case: Licensing Studio - super admin only (handled by early return in layout)
  if (item.title === 'Licensing Studio') {
    return false; // Super admins have their own menu
  }
  // Special case: Overview - visible to all authenticated users
  if (item.href === '/admin') {
    return true;
  }
  // Special case: RBAC - tenant admin or users with rbac permissions
  if (item.href === '/admin/security/rbac') {
    return userRoles.includes('role_tenant_admin') ||
           userPermissions.includes('rbac:assign') ||
           userPermissions.includes('rbac:roles_edit');
  }

  // Use menu access matrix for all other items
  let accessConfig = MENU_ACCESS_MATRIX[item.href];

  // For finance sub-pages, use the finance root config
  if (!accessConfig && item.href.startsWith('/admin/finance')) {
    accessConfig = MENU_ACCESS_MATRIX['/admin/finance'];
  }

  if (accessConfig) {
    // Step 1: Role check - user must have ANY of the required roles
    const hasRole = accessConfig.roles.some(role => userRoles.includes(role));

    if (hasRole) {
      // Step 2: Permission check (if specified)
      if (accessConfig.permission) {
        return userPermissions.includes(accessConfig.permission);
      }
      // No permission required, role check was sufficient
      return true;
    }
    return false;
  }

  // No config found - default to role_tenant_admin only
  return userRoles.includes('role_tenant_admin');
}

/**
 * PERFORMANCE OPTIMIZED: Filter menu sections using cached roles/permissions
 * This is synchronous and does NOT make any database queries
 *
 * Previous implementation made 80+ individual database queries in nested loops.
 * This version uses pre-fetched roles/permissions for O(1) lookups.
 */
function filterSectionsWithCachedAccess(
  sections: AdminNavSection[],
  userRoles: string[],
  userPermissions: string[]
): AdminNavSection[] {
  const filteredSections: AdminNavSection[] = [];

  for (const section of sections) {
    const filteredItems = [];

    // Filter main items - synchronous check against cached data
    for (const item of section.items) {
      if (checkMenuItemAccessCached(item, userRoles, userPermissions)) {
        filteredItems.push(item);
      }
    }

    // Filter sub-groups and their items
    const filteredSubGroups = [];
    if (section.subGroups) {
      for (const subGroup of section.subGroups) {
        const filteredSubGroupItems = [];
        for (const item of subGroup.items) {
          if (checkMenuItemAccessCached(item, userRoles, userPermissions)) {
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
