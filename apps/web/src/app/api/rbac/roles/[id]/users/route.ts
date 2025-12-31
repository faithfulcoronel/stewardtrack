import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const { id: roleId } = await params;

    // Get users assigned to this role following the same approach as getMultiRoleUsers
    const users = await rbacService.getUsersWithRole(roleId);

    return NextResponse.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error fetching users for role:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch users for role'
      },
      { status: 500 }
    );
  }
}