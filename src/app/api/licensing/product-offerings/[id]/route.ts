import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { LicensingService } from '@/services/LicensingService';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/licensing/product-offerings/:id
 * Retrieves a single product offering by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const licensingService = container.get<LicensingService>(TYPES.LicensingService);

    const { searchParams } = new URL(request.url);
    const withFeatures = searchParams.get('withFeatures') === 'true';

    let offering;

    if (withFeatures) {
      offering = await licensingService.getProductOfferingWithFeatures(id);
    } else {
      offering = await licensingService.getProductOffering(id);
    }

    if (!offering) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product offering not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: offering,
    });
  } catch (error) {
    console.error('Error fetching product offering:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch product offering',
      },
      { status: 500 }
    );
  }
}
