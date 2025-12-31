import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';
import { getAuthenticatedUser } from '@/lib/api/auth';

/**
 * GET /api/rbac/delegation/context
 *
 * Returns the current user's delegation context including:
 * - Delegation scope (campus/ministry)
 * - Allowed roles and bundles
 * - Scope IDs they can manage
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
    const delegatedContext = await rbacService.getDelegatedContext(user.id);

    if (!delegatedContext) {
      return NextResponse.json({
        success: false,
        error: 'No delegation permissions found'
      }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: delegatedContext
    });
  } catch (error) {
    console.error('Error fetching delegation context:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch delegation context'
      },
      { status: 500 }
    );
  }
}
