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
 * GET /api/licensing/features/[id]/permissions
 * Get all permissions for a feature with their role templates
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Check super admin permission
    const { isAuthorized } = await checkSuperAdmin();
    if (!isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Super admin access required.',
        },
        { status: 403 }
      );
    }

    const { id: featureId } = await params;
    const featurePermissionService = container.get<FeaturePermissionService>(
      TYPES.FeaturePermissionService
    );

    const permissions = await featurePermissionService.getFeaturePermissionsWithTemplates(
      featureId
    );

    return NextResponse.json({
      success: true,
      data: permissions,
    });
  } catch (error) {
    console.error('Error fetching feature permissions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch permissions',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/licensing/features/[id]/permissions
 * Create a new permission for a feature with optional role templates
 *
 * Request body:
 * {
 *   permission: {
 *     permission_code: string,
 *     display_name: string,
 *     description?: string,
 *     is_required?: boolean,
 *     display_order?: number
 *   },
 *   roleTemplates?: Array<{
 *     role_key: string,
 *     is_recommended?: boolean,
 *     reason?: string
 *   }>
 * }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Check super admin permission
    console.log('[DEBUG] POST /api/licensing/features/[id]/permissions - Starting');
    const { isAuthorized, user } = await checkSuperAdmin();
    console.log('[DEBUG] Auth check result:', { isAuthorized, userId: user?.id });

    if (!isAuthorized) {
      console.log('[DEBUG] Authorization failed - user is not super admin');
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Super admin access required.',
        },
        { status: 403 }
      );
    }

    const { id: featureId } = await params;
    const body = await request.json();
    console.log('[DEBUG] Request body:', JSON.stringify(body, null, 2));

    // Validate request body
    if (!body.permission) {
      return NextResponse.json(
        {
          success: false,
          error: 'Permission data is required',
        },
        { status: 400 }
      );
    }

    if (!body.permission.permission_code) {
      return NextResponse.json(
        {
          success: false,
          error: 'Permission code is required',
        },
        { status: 400 }
      );
    }

    if (!body.permission.display_name) {
      return NextResponse.json(
        {
          success: false,
          error: 'Display name is required',
        },
        { status: 400 }
      );
    }

    console.log('[DEBUG] Getting FeaturePermissionService from container');
    const featurePermissionService = container.get<FeaturePermissionService>(
      TYPES.FeaturePermissionService
    );

    const permissionData = {
      permission: {
        feature_id: featureId,
        permission_code: body.permission.permission_code,
        display_name: body.permission.display_name,
        description: body.permission.description,
        is_required: body.permission.is_required ?? true,
        display_order: body.permission.display_order ?? 0,
      },
      roleTemplates: body.roleTemplates,
    };
    console.log('[DEBUG] Permission data to create:', JSON.stringify(permissionData, null, 2));

    // Create permission with templates
    console.log('[DEBUG] Calling createPermissionWithTemplates...');
    const result = await featurePermissionService.createPermissionWithTemplates(permissionData);
    console.log('[DEBUG] Permission created successfully:', { permissionId: result.permission.id });

    return NextResponse.json(
      {
        success: true,
        data: {
          permission: result.permission,
          templates: result.templates,
        },
        message: 'Permission created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[ERROR] Error creating feature permission:', error);
    console.error('[ERROR] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create permission',
      },
      { status: 500 }
    );
  }
}
