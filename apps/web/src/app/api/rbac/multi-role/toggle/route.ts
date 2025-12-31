import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';

export async function POST(request: NextRequest) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const body = await request.json();

    const { user_id, enabled } = body;

    if (!user_id || typeof enabled !== 'boolean') {
      return NextResponse.json(
        {
          success: false,
          error: 'user_id and enabled (boolean) are required'
        },
        { status: 400 }
      );
    }

    const result = await rbacService.toggleMultiRoleMode(user_id, enabled);

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error toggling multi-role status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to toggle multi-role status'
      },
      { status: 500 }
    );
  }
}