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
 * PUT /api/licensing/features/permissions/[id]/templates
 * Replace all role templates for a permission
 *
 * Request body:
 * {
 *   templates: Array<{
 *     role_key: string,
 *     is_recommended?: boolean,
 *     reason?: string
 *   }>
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

    // Validate request body
    if (!body.templates || !Array.isArray(body.templates)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Templates array is required',
        },
        { status: 400 }
      );
    }

    const featurePermissionService = container.get<FeaturePermissionService>(
      TYPES.FeaturePermissionService
    );

    // Update role templates
    const templates = await featurePermissionService.updateRoleTemplates(
      permissionId,
      body.templates
    );

    return NextResponse.json({
      success: true,
      data: templates,
      message: 'Role templates updated successfully',
    });
  } catch (error) {
    console.error('Error updating role templates:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update role templates',
      },
      { status: 500 }
    );
  }
}
