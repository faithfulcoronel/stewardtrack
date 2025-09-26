import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const body = await request.json();
    const { id } = params;

    const updatedPermission = await rbacService.updateDelegationPermission(id, body);

    return NextResponse.json({
      success: true,
      data: updatedPermission
    });
  } catch (error) {
    console.error('Error updating delegation permission:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update delegation permission'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const { id } = params;

    await rbacService.revokeDelegationPermission(id);

    return NextResponse.json({
      success: true,
      message: 'Delegation permission revoked successfully'
    });
  } catch (error) {
    console.error('Error revoking delegation permission:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to revoke delegation permission'
      },
      { status: 500 }
    );
  }
}