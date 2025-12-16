import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { LicensingService } from '@/services/LicensingService';
import { checkSuperAdmin } from '@/utils/authUtils';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

interface AssignFeatureToOfferingDto {
  feature_id: string;
  is_required?: boolean;
}

/**
 * GET /api/licensing/product-offerings/[id]/features
 * Retrieves all features for a product offering
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

    const offering = await licensingService.getProductOfferingWithFeatures(id);

    return NextResponse.json({
      success: true,
      data: offering.features || [],
    });
  } catch (error) {
    console.error('Error fetching offering features:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch offering features',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/licensing/product-offerings/[id]/features
 * Assigns a feature to a product offering
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
    const body: AssignFeatureToOfferingDto = await request.json();

    if (!body.feature_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'feature_id is required',
        },
        { status: 400 }
      );
    }

    const licensingService = container.get<LicensingService>(TYPES.LicensingService);

    await licensingService.addFeatureToOffering(
      id,
      body.feature_id,
      body.is_required ?? true
    );

    return NextResponse.json({
      success: true,
      message: 'Feature assigned to offering successfully',
    });
  } catch (error) {
    console.error('Error assigning feature to offering:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to assign feature to offering',
      },
      { status: 500 }
    );
  }
}
