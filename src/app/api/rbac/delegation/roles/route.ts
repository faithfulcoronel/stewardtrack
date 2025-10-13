import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';
import { getAuthenticatedUser } from '@/lib/api/auth';

/**
 * GET /api/rbac/delegation/roles
 *
 * Returns roles available for delegation within the user's scope.
 * Each role includes:
 * - id: Role identifier
 * - name: Role display name
 * - scope: Role scope (system/tenant/campus/ministry)
 * - is_delegatable: Whether this role can be delegated
 * - description: Role description
 *
 * Only returns roles that:
 * 1. Are marked as delegatable (is_delegatable = true)
 * 2. Are within the user's delegation permissions
 *
 * Requires: Authenticated user with delegation permissions
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await getAuthenticatedUser();
    if (auth.error) return auth.error;

    const { user } = auth;

    // Get RBAC service - it handles tenant context internally
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const roles = await rbacService.getDelegationRoles(user.id);

    return NextResponse.json({
      success: true,
      data: roles
    });
  } catch (error) {
    console.error('Error fetching delegation roles:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch delegation roles'
      },
      { status: 500 }
    );
  }
}
