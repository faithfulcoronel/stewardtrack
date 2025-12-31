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
 * GET /api/licensing/features/[id]/permissions/validate
 * Validate that a feature has proper permission configuration
 *
 * This endpoint checks:
 * - Feature has at least one permission
 * - At least one permission is marked as required
 * - Each permission has role templates assigned
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

    const validation = await featurePermissionService.validateFeatureConfiguration(featureId);

    return NextResponse.json({
      success: validation.valid,
      data: {
        valid: validation.valid,
        errors: validation.errors,
        warnings: validation.warnings,
      },
      message: validation.valid
        ? 'Feature configuration is valid'
        : 'Feature configuration has errors',
    });
  } catch (error) {
    console.error('Error validating feature configuration:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate configuration',
      },
      { status: 500 }
    );
  }
}
