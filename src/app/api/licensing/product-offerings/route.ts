import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { LicensingService } from '@/services/LicensingService';
import type { CreateProductOfferingDto, UpdateProductOfferingDto } from '@/models/productOffering.model';

/**
 * GET /api/licensing/product-offerings
 * Retrieves all active product offerings
 */
export async function GET(request: NextRequest) {
  try {
    const licensingService = container.get<LicensingService>(TYPES.LicensingService);

    const { searchParams } = new URL(request.url);
    const tier = searchParams.get('tier');
    const withFeatures = searchParams.get('withFeatures') === 'true';

    let offerings;

    if (tier) {
      offerings = await licensingService.getProductOfferingsByTier(tier);
    } else {
      offerings = await licensingService.getActiveProductOfferings();
    }

    // Optionally enrich with features
    if (withFeatures && offerings.length > 0) {
      const enrichedOfferings = await Promise.all(
        offerings.map(async (offering) => {
          return await licensingService.getProductOfferingWithFeatures(offering.id);
        })
      );

      return NextResponse.json({
        success: true,
        data: enrichedOfferings,
      });
    }

    return NextResponse.json({
      success: true,
      data: offerings,
    });
  } catch (error) {
    console.error('Error fetching product offerings:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch product offerings',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/licensing/product-offerings
 * Creates a new product offering
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateProductOfferingDto = await request.json();
    const licensingService = container.get<LicensingService>(TYPES.LicensingService);

    const offering = await licensingService.createProductOffering(body);

    return NextResponse.json({
      success: true,
      data: offering,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating product offering:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create product offering',
      },
      { status: 500 }
    );
  }
}
