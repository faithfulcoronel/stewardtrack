import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { FeaturePermissionService } from '@/services/FeaturePermissionService';
import { checkSuperAdmin } from '@/utils/authUtils';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/licensing/features/permissions/[id]
 * Get a specific permission with its role templates
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Check super admin permission
    const isSuperAdmin = await checkSuperAdmin();
    if (!isSuperAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Super admin access required.',
        },
        { status: 403 }
      );
    }

    const { id: permissionId } = await params;
    const featurePermissionService = container.get<FeaturePermissionService>(
      TYPES.FeaturePermissionService
    );

    const result = await featurePermissionService.getPermissionWithTemplates(permissionId);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching permission:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch permission',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/licensing/features/permissions/[id]
 * Update a feature permission
 *
 * Request body:
 * {
 *   permission_code?: string,
 *   display_name?: string,
 *   description?: string,
 *   is_required?: boolean,
 *   display_order?: number
 * }
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // Check super admin permission
    const isSuperAdmin = await checkSuperAdmin();
    if (!isSuperAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Super admin access required.',
        },
        { status: 403 }
      );
    }

    const { id: permissionId } = await params;
    const body = await request.json();

    const featurePermissionService = container.get<FeaturePermissionService>(
      TYPES.FeaturePermissionService
    );

    // Update permission
    const updatedPermission = await featurePermissionService.updatePermission(permissionId, body);

    return NextResponse.json({
      success: true,
      data: updatedPermission,
      message: 'Permission updated successfully',
    });
  } catch (error) {
    console.error('Error updating permission:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update permission',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/licensing/features/permissions/[id]
 * Delete a feature permission and all its role templates
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Check super admin permission
    const isSuperAdmin = await checkSuperAdmin();
    if (!isSuperAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Super admin access required.',
        },
        { status: 403 }
      );
    }

    const { id: permissionId } = await params;
    const featurePermissionService = container.get<FeaturePermissionService>(
      TYPES.FeaturePermissionService
    );

    await featurePermissionService.deletePermission(permissionId);

    return NextResponse.json({
      success: true,
      message: 'Permission deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting permission:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete permission',
      },
      { status: 500 }
    );
  }
}
