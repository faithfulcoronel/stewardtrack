import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';
import { CreateSurfaceBindingDto } from '@/models/rbac.model';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const body: Partial<CreateSurfaceBindingDto> = await request.json();
    const { id: bindingId } = await context.params;

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
    const message = error instanceof Error ? error.message : 'Failed to update surface binding';
    const status = error instanceof Error && error.message === 'Surface binding not found' ? 404 : 500;
    return NextResponse.json(
      {
        success: false,
        error: message
      },
      { status }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const { id: bindingId } = await context.params;

    await rbacService.deleteSurfaceBinding(bindingId);

    return NextResponse.json({
      success: true,
      message: 'Surface binding deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting surface binding:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete surface binding';
    const status = error instanceof Error && error.message === 'Surface binding not found' ? 404 : 500;
    return NextResponse.json(
      {
        success: false,
        error: message
      },
      { status }
    );
  }
}