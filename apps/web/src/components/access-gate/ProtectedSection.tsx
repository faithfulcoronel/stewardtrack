/**
 * ProtectedSection Component
 *
 * Simple wrapper for protecting UI sections with access gates
 */

'use client';

import { ReactNode } from 'react';
import { GateGuard } from './GateGuard';

interface ProtectedSectionProps {
  // User ID to check access for
  userId: string;

  // Tenant ID (optional)
  tenantId?: string;

  // Permissions to check
  permissions?: string | string[];

  // Permission mode (all or any)
  permissionMode?: 'all' | 'any';

  // Roles to check (alternative to permissions)
  roles?: string | string[];

  // Role mode (all or any)
  roleMode?: 'all' | 'any';

  // Feature/license to check (alternative)
  featureCode?: string;

  // Require super admin
  requireSuperAdmin?: boolean;

  // Content to show when access is granted
  children: ReactNode;

  // Content to show when access is denied
  fallback?: ReactNode;

  // Custom className for styling
  className?: string;

  // Hide instead of showing fallback
  hideOnDenied?: boolean;
}

/**
 * ProtectedSection - Simple component for protecting UI sections
 *
 * @example
 * // Protect by permission
 * <ProtectedSection userId={userId} permissions="members.delete">
 *   <DeleteButton />
 * </ProtectedSection>
 *
 * // Protect by role
 * <ProtectedSection userId={userId} roles={['campus-pastor', 'senior-pastor']}>
 *   <CampusManagement />
 * </ProtectedSection>
 *
 * // Protect by feature license
 * <ProtectedSection userId={userId} featureCode="members.core">
 *   <MemberManagement />
 * </ProtectedSection>
 */
export function ProtectedSection({
  userId,
  tenantId,
  permissions,
  permissionMode = 'all',
  roles,
  roleMode = 'any',
  featureCode,
  requireSuperAdmin,
  children,
  fallback,
  className,
  hideOnDenied = false,
}: ProtectedSectionProps) {
  // Create check function based on props
  const check = async () => {
    const params = new URLSearchParams();
    params.append('userId', userId);
    if (tenantId) params.append('tenantId', tenantId);

    // Determine which API endpoint to use
    let endpoint = '/api/access-gate/check';
    let body: any = { userId, tenantId };

    if (permissions) {
      body.permissions = Array.isArray(permissions) ? permissions : [permissions];
      body.permissionMode = permissionMode;
      body.type = 'permission';
    } else if (roles) {
      body.roles = Array.isArray(roles) ? roles : [roles];
      body.roleMode = roleMode;
      body.type = 'role';
    } else if (featureCode) {
      body.featureCode = featureCode;
      body.type = 'license';
    } else if (requireSuperAdmin) {
      body.type = 'superAdmin';
    } else {
      body.type = 'authenticated';
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!data.success) {
      return { allowed: false, reason: data.error };
    }

    return {
      allowed: data.data.allowed,
      reason: data.data.reason,
      redirectTo: data.data.redirectTo,
    };
  };

  const fallbackContent = hideOnDenied ? null : fallback;

  return (
    <div className={className}>
      <GateGuard check={check} fallback={fallbackContent}>
        {children}
      </GateGuard>
    </div>
  );
}
