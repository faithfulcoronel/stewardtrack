import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { LicensingService } from '@/services/LicensingService';
import { checkSuperAdmin } from '@/utils/authUtils';

interface RouteParams {
  params: Promise<{
    id: string;
    bundleId: string;
  }>;
}

/**
 * DELETE /api/licensing/product-offerings/[id]/bundles/[bundleId]
 * Removes a bundle from a product offering
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

    const { id, bundleId } = await params;
    const licensingService = container.get<LicensingService>(TYPES.LicensingService);

    await licensingService.removeBundleFromOffering(id, bundleId);

    return NextResponse.json({
      success: true,
      message: 'Bundle removed from offering successfully',
    });
  } catch (error) {
    console.error('Error removing bundle from offering:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove bundle from offering',
      },
      { status: 500 }
    );
  }
}
