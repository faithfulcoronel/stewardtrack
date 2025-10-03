import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';
import { UpdatePermissionBundleDto } from '@/models/rbac.model';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || undefined;

    const bundle = await rbacService.getBundleWithPermissions(id, tenantId);

    if (!bundle) {
      return NextResponse.json(
        {
          success: false,
          error: 'Permission bundle not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: bundle
    });
  } catch (error) {
    console.error('Error fetching permission bundle:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch permission bundle'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const body: UpdatePermissionBundleDto = await request.json();

    const bundle = await rbacService.updatePermissionBundle(id, body);

    return NextResponse.json({
      success: true,
      data: bundle
    });
  } catch (error) {
    console.error('Error updating permission bundle:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update permission bundle'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const rbacService = container.get<RbacService>(TYPES.RbacService);

    await rbacService.deletePermissionBundle(id);

    return NextResponse.json({
      success: true,
      message: 'Permission bundle deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting permission bundle:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete permission bundle'
      },
      { status: 500 }
    );
  }
}