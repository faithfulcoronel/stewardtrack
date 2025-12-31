import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';

interface RouteParams {
  params: {
    userId: string;
    roleId: string;
  };
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);

    await rbacService.revokeRole(params.userId, params.roleId);

    return NextResponse.json({
      success: true,
      message: 'Role revoked successfully'
    });
  } catch (error) {
    console.error('Error revoking role:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to revoke role'
      },
      { status: 500 }
    );
  }
}