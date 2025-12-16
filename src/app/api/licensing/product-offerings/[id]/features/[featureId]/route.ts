import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { LicensingService } from '@/services/LicensingService';
import { checkSuperAdmin } from '@/utils/authUtils';

interface RouteParams {
  params: Promise<{
    id: string;
    featureId: string;
  }>;
}

/**
 * DELETE /api/licensing/product-offerings/[id]/features/[featureId]
 * Removes a feature from a product offering
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const { id, featureId } = await params;
    const licensingService = container.get<LicensingService>(TYPES.LicensingService);

    await licensingService.removeFeatureFromOffering(id, featureId);

    return NextResponse.json({
      success: true,
      message: 'Feature removed from offering successfully',
    });
  } catch (error) {
    console.error('Error removing feature from offering:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove feature from offering',
      },
      { status: 500 }
    );
  }
}
