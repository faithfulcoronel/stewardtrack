import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';
import { UpdateRoleDto } from '@/models/rbac.model';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || undefined;

    const role = await rbacService.getRoleWithPermissions(params.id, tenantId);

    if (!role) {
      return NextResponse.json(
        {
          success: false,
          error: 'Role not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: role
    });
  } catch (error) {
    console.error('Error fetching role:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch role'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const body: UpdateRoleDto = await request.json();

    const role = await rbacService.updateRole(params.id, body);

    return NextResponse.json({
      success: true,
      data: role
    });
  } catch (error) {
    console.error('Error updating role:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update role'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);

    await rbacService.deleteRole(params.id);

    return NextResponse.json({
      success: true,
      message: 'Role deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting role:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete role'
      },
      { status: 500 }
    );
  }
}