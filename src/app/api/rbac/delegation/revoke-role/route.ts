import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';

export async function POST(request: NextRequest) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const delegatorId = request.headers.get('x-user-id') || 'current-user-id';

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

    const result = await rbacService.revokeDelegatedRole(delegatorId, {
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

