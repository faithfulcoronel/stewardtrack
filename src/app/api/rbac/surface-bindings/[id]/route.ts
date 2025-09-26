import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';
import { CreateSurfaceBindingDto } from '@/models/rbac.model';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const body: Partial<CreateSurfaceBindingDto> = await request.json();
    const bindingId = params.id;

    // Validate that either role_id or bundle_id is provided
    if (!body.role_id && !body.bundle_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Either role_id or bundle_id is required'
        },
        { status: 400 }
      );
    }

    const updatedBinding = await rbacService.updateSurfaceBinding(bindingId, body);

    return NextResponse.json({
      success: true,
      data: updatedBinding
    });
  } catch (error) {
    console.error('Error updating surface binding:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update surface binding'
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
    const bindingId = params.id;

    await rbacService.deleteSurfaceBinding(bindingId);

    return NextResponse.json({
      success: true,
      message: 'Surface binding deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting surface binding:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete surface binding'
      },
      { status: 500 }
    );
  }
}