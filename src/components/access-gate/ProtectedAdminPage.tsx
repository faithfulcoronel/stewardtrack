/**
 * ProtectedAdminPage Component
 *
 * Server-side page protection for admin routes with AccessGate integration
 * This ensures that even if users know the URL, they cannot access protected pages
 */

import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AccessGate } from '@/lib/access-gate';

interface ProtectedAdminPageProps {
  // Access gate to use for protection
  gate?: AccessGate;

  // Alternative: permission-based access
  permission?: string | string[];
  permissionMode?: 'all' | 'any';

  // Alternative: role-based access
  role?: string | string[];
  roleMode?: 'all' | 'any';

  // Super admin only
  superAdminOnly?: boolean;

  // Content to render if access is granted
  children: ReactNode;

  // Custom redirect path on denial (default: /unauthorized)
  redirectTo?: string;

  // Require tenant context (default: true, false for super admin pages)
  requireTenant?: boolean;
}

/**
 * ProtectedAdminPage - Server component for protecting admin pages
 *
 * Prevents direct URL access to protected pages by checking AccessGate on the server
 *
 * @example Basic permission check
 * <ProtectedAdminPage permission="members:read">
 *   <MembersPage />
 * </ProtectedAdminPage>
 *
 * @example Super admin only
 * <ProtectedAdminPage superAdminOnly>
 *   <LicensingStudioPage />
 * </ProtectedAdminPage>
 *
 * @example Custom gate
 * <ProtectedAdminPage gate={Gate.withLicense('member-management')}>
 *   <MemberManagement />
 * </ProtectedAdminPage>
 */
export async function ProtectedAdminPage({
  gate: customGate,
  permission,
  permissionMode = 'all',
  role,
  roleMode = 'any',
  superAdminOnly = false,
  children,
  redirectTo,
  requireTenant = true,
}: ProtectedAdminPageProps) {
  // Get authenticated user
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Get tenant context (if required)
  let tenantId: string | undefined;

  if (requireTenant && !superAdminOnly) {
    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!tenantUser) {
      redirect('/unauthorized?reason=no_tenant');
    }

    tenantId = tenantUser.tenant_id;
  }

  // Determine which gate to use
  let gate: AccessGate;

  if (customGate) {
    // Use provided custom gate
    gate = customGate;
  } else if (superAdminOnly) {
    // Super admin check
    const { Gate } = await import('@/lib/access-gate');
    gate = Gate.superAdminOnly();
  } else if (permission) {
    // Permission-based check
    const { Gate } = await import('@/lib/access-gate');
    gate = Gate.withPermission(permission, permissionMode);
  } else if (role) {
    // Role-based check
    const { Gate } = await import('@/lib/access-gate');
    gate = Gate.withRole(role, roleMode);
  } else {
    // No gate specified - just require authentication
    return <>{children}</>;
  }

  // Check access
  const result = await gate.check(user.id, tenantId);

  if (!result.allowed) {
    const path = redirectTo || result.redirectTo || '/unauthorized';
    redirect(path);
  }

  // Access granted - render children
  return <>{children}</>;
}

/**
 * Helper: Create a protected page wrapper with preset configuration
 */
export function createProtectedPage(config: Omit<ProtectedAdminPageProps, 'children'>) {
  return function ProtectedPageWrapper({ children }: { children: ReactNode }) {
    return <ProtectedAdminPage {...config}>{children}</ProtectedAdminPage>;
  };
}

/**
 * Preset: Super Admin Page Protection
 */
export const SuperAdminPage = createProtectedPage({
  superAdminOnly: true,
  requireTenant: false,
});

/**
 * Preset: Tenant Admin Page Protection
 */
export const TenantAdminPage = createProtectedPage({
  role: 'tenant_admin',
  requireTenant: true,
});

/**
 * Preset: Members Page Protection
 */
export const MembersProtectedPage = createProtectedPage({
  permission: 'members:read',
  requireTenant: true,
});

/**
 * Preset: Finance Page Protection
 */
export const FinanceProtectedPage = createProtectedPage({
  permission: 'finance:read',
  requireTenant: true,
});

/**
 * Preset: RBAC Management Page Protection
 */
export const RBACProtectedPage = createProtectedPage({
  permission: 'rbac:manage',
  requireTenant: true,
});
