import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';

export async function POST(request: NextRequest) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const body = await request.json();

    const { user_id, role_id } = body;

    if (!user_id || !role_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'user_id and role_id are required'
        },
        { status: 400 }
      );
    }

    // Remove role from user's multi-role assignment
    const result = await rbacService.removeUserRole(user_id, role_id);

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error removing role from user:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove role'
      },
      { status: 500 }
    );
  }
}