import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';
import { getAuthenticatedUser } from '@/lib/api/auth';

/**
 * GET /api/rbac/delegation/stats
 *
 * Returns statistics about the user's delegation scope.
 * Includes:
 * - totalUsers: Total number of users in delegated scope
 * - activeUsers: Users with at least one role assigned
 * - totalRoles: All available roles in system
 * - delegatableRoles: Roles the user can delegate
 * - scopeCount: Number of scopes (campuses/ministries) managed
 * - recentChanges: Number of recent delegation changes
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
    const stats = await rbacService.getDelegationStats(user.id);

    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching delegation stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch delegation stats'
      },
      { status: 500 }
    );
  }
}
