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
 * GET /api/licensing/features/[id]/permissions/suggestions
 * Get suggested permissions for a feature based on its surface_id
 *
 * This endpoint helps Product Owners by providing intelligent suggestions
 * for common permissions based on the feature's metadata surface.
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

    const suggestions = await featurePermissionService.suggestPermissionsForFeature(featureId);

    return NextResponse.json({
      success: true,
      data: suggestions,
      message: 'Permission suggestions generated successfully',
    });
  } catch (error) {
    console.error('Error generating permission suggestions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate suggestions',
      },
      { status: 500 }
    );
  }
}
