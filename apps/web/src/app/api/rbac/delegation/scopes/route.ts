import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';
import { getAuthenticatedUser } from '@/lib/api/auth';

/**
 * GET /api/rbac/delegation/scopes
 *
 * Returns the scopes (campuses or ministries) that the user can manage.
 * Each scope includes:
 * - id: Scope identifier
 * - name: Display name
 * - type: 'campus' or 'ministry'
 * - user_count: Number of users in this scope
 * - role_count: Number of active roles in this scope
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
    const scopes = await rbacService.getDelegationScopes(user.id);

    return NextResponse.json({
      success: true,
      data: scopes
    });
  } catch (error) {
    console.error('Error fetching delegation scopes:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch delegation scopes'
      },
      { status: 500 }
    );
  }
}