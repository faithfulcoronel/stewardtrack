import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const body = await request.json();

    if (!body.permission_ids || !Array.isArray(body.permission_ids)) {
      return NextResponse.json(
        {
          success: false,
          error: 'permission_ids array is required'
        },
        { status: 400 }
      );
    }

    await rbacService.addPermissionsToBundle(params.id, body.permission_ids);

    return NextResponse.json({
      success: true,
      message: 'Permissions added to bundle successfully'
    });
  } catch (error) {
    console.error('Error adding permissions to bundle:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add permissions to bundle'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const body = await request.json();

    if (!body.permission_ids || !Array.isArray(body.permission_ids)) {
      return NextResponse.json(
        {
          success: false,
          error: 'permission_ids array is required'
        },
        { status: 400 }
      );
    }

    await rbacService.removePermissionsFromBundle(params.id, body.permission_ids);

    return NextResponse.json({
      success: true,
      message: 'Permissions removed from bundle successfully'
    });
  } catch (error) {
    console.error('Error removing permissions from bundle:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove permissions from bundle'
      },
      { status: 500 }
    );
  }
}