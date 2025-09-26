import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';

export async function POST(request: NextRequest) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const delegatorId = request.headers.get('x-user-id') || 'current-user-id';

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

    const result = await rbacService.assignDelegatedRole(delegatorId, {
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

