import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';
import { getAuthenticatedUser } from '@/lib/api/auth';

/**
 * POST /api/rbac/delegation/revoke-role
 *
 * Revokes a role from a user within the delegated scope.
 *
 * Request body:
 * - user_id: The user to revoke the role from (required)
 * - role_id: The role to revoke (required)
 *
 * Business rules:
 * 1. User must have delegation permissions
 * 2. Can only revoke roles within user's delegated scope
 * 3. Cannot revoke roles assigned by higher-level administrators
 * 4. Scope boundaries are enforced
 *
 * Returns:
 * - success: Boolean indicating operation success
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
    const { user_id: userId, role_id: roleId } = body ?? {};

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
    const result = await rbacService.revokeDelegatedRole(user.id, {
      user_id: userId,
      role_id: roleId
    });

    return NextResponse.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    console.error('Error revoking delegated role:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to revoke delegated role'
      },
      { status: 500 }
    );
  }
}

