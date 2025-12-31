import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';
import { getAuthenticatedUser } from '@/lib/api/auth';

/**
 * POST /api/rbac/delegation/assign-role
 *
 * Assigns a role to a user within the delegated scope.
 *
 * Request body:
 * - user_id: The user to assign the role to (required)
 * - role_id: The role to assign (required)
 * - scope_id: Optional scope identifier (campus/ministry ID)
 *
 * Business rules:
 * 1. User must have delegation permissions
 * 2. Role must be delegatable (is_delegatable = true)
 * 3. Role must be within user's allowed_roles
 * 4. Target user must be within user's delegated scope
 * 5. Scope boundaries are enforced (campus delegator cannot assign ministry roles)
 *
 * Returns:
 * - success: Boolean indicating operation success
 * - assignment: Created user_role record with scope details
 *
 * Requires: Authenticated user with delegation permissions
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await getAuthenticatedUser();
    if (auth.error) return auth.error;

    const { user } = auth;

    // Parse and validate request body
    const body = await request.json();
    const { user_id: userId, role_id: roleId, scope_id: scopeId } = body ?? {};

    if (!userId || !roleId) {
      return NextResponse.json(
        {
          success: false,
          error: 'user_id and role_id are required'
        },
        { status: 400 }
      );
    }

    // Get RBAC service - it handles tenant context internally
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const result = await rbacService.assignDelegatedRole(user.id, {
      user_id: userId,
      role_id: roleId,
      scope_id: scopeId
    });

    return NextResponse.json({
      success: result.success,
      data: result.assignment
    });
  } catch (error) {
    console.error('Error assigning delegated role:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to assign delegated role'
      },
      { status: 500 }
    );
  }
}

