/**
 * ProtectedAdminPage Component
 *
 * Server-side page protection for admin routes with AccessGate integration
 * This ensures that even if users know the URL, they cannot access protected pages
 *
 * Follows architectural pattern: Component → Service → Repository → Adapter → Supabase
 */

import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AuthorizationService } from '@/services/AuthorizationService';
import type { TenantService } from '@/services/TenantService';
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
 * <ProtectedAdminPage permission="members:view">
 *   <MembersPage />
 * </ProtectedAdminPage>
 *
 * @example Super admin only
 * <ProtectedAdminPage superAdminOnly>
 *   <LicensingStudioPage />
 * </ProtectedAdminPage>
 *
 * @example Custom gate
 * <ProtectedAdminPage gate={Gate.withLicense('members.core')}>
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
  // Get authenticated user via service layer
  const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
  const authResult = await authService.checkAuthentication();

  if (!authResult.authorized || !authResult.userId) {
    redirect('/login');
  }

  const userId = authResult.userId;

  // Get tenant context (if required) via service layer
  let tenantId: string | undefined;

  if (requireTenant && !superAdminOnly) {
    try {
      const tenantService = container.get<TenantService>(TYPES.TenantService);
      const tenant = await tenantService.getCurrentTenant();

      if (!tenant) {
        redirect('/unauthorized?reason=no_tenant');
      }

      tenantId = tenant.id;
    } catch (error) {
      console.error('[ProtectedAdminPage] Failed to get tenant context:', error);
      redirect('/unauthorized?reason=no_tenant');
    }
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
  const result = await gate.check(userId, tenantId);

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
  permission: 'members:view',
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
 * Uses rbac:assign permission (from rbac.management feature)
 */
export const RBACProtectedPage = createProtectedPage({
  permission: 'rbac:assign',
  requireTenant: true,
});
