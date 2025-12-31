import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { LicensingService } from '@/services/LicensingService';
import { AssignBundleToOfferingDto } from '@/models/productOffering.model';
import { checkSuperAdmin } from '@/utils/authUtils';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/licensing/product-offerings/[id]/bundles
 * Retrieves all bundles for a product offering
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

    const { id } = await params;
    const licensingService = container.get<LicensingService>(TYPES.LicensingService);

    const bundles = await licensingService.getOfferingBundles(id);

    return NextResponse.json({
      success: true,
      data: bundles,
    });
  } catch (error) {
    console.error('Error fetching offering bundles:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch offering bundles',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/licensing/product-offerings/[id]/bundles
 * Assigns a bundle to a product offering
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;
    const body: AssignBundleToOfferingDto = await request.json();

    if (!body.bundle_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'bundle_id is required',
        },
        { status: 400 }
      );
    }

    const licensingService = container.get<LicensingService>(TYPES.LicensingService);

    await licensingService.addBundleToOffering(
      id,
      body.bundle_id,
      body.is_required ?? true,
      body.display_order
    );

    return NextResponse.json({
      success: true,
      message: 'Bundle assigned to offering successfully',
    });
  } catch (error) {
    console.error('Error assigning bundle to offering:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to assign bundle to offering',
      },
      { status: 500 }
    );
  }
}
