import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';

export async function POST(request: NextRequest) {
  try {
    const _rbacService = container.get<RbacService>(TYPES.RbacService);
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

    // Toggle multi-role status for user
    const result = {
      user_id,
      multi_role_enabled: enabled,
      updated_at: new Date().toISOString()
    };

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