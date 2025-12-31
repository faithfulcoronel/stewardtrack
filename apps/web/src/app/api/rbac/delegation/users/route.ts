import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';
import { getAuthenticatedUser } from '@/lib/api/auth';

/**
 * GET /api/rbac/delegation/users
 *
 * Returns users within the delegated scope that the user can manage.
 * Each user includes:
 * - id: User identifier
 * - email: User email
 * - first_name, last_name: User names
 * - delegated_roles: Roles assigned within the delegated scope
 * - effective_scope: The scope type (campus/ministry)
 *
 * Query parameters:
 * - scope_id: Optional filter by specific scope ID
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
    const users = await rbacService.getDelegatedUsers(user.id);

    return NextResponse.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error fetching delegated users:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch delegated users'
      },
      { status: 500 }
    );
  }
}