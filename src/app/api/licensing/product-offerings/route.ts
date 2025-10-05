import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { LicensingService } from '@/services/LicensingService';
import type { CreateProductOfferingDto, UpdateProductOfferingDto } from '@/models/productOffering.model';

/**
 * GET /api/licensing/product-offerings
 * Retrieves all active product offerings
 *
 * Query params:
 * - tier: Filter by tier
 * - withFeatures: Include individual features
 * - withBundles: Include bundles
 * - complete: Include both bundles and features
 */
export async function GET(request: NextRequest) {
  try {
    const licensingService = container.get<LicensingService>(TYPES.LicensingService);

    const { searchParams } = new URL(request.url);
    const tier = searchParams.get('tier');
    const withFeatures = searchParams.get('withFeatures') === 'true';
    const withBundles = searchParams.get('withBundles') === 'true';
    const complete = searchParams.get('complete') === 'true';

    let offerings;

    if (tier) {
      offerings = await licensingService.getProductOfferingsByTier(tier);
    } else {
      offerings = await licensingService.getActiveProductOfferings();
    }

    // Optionally enrich with features, bundles, or both
    if ((withFeatures || withBundles || complete) && offerings.length > 0) {
      const enrichedOfferings = await Promise.all(
        offerings.map(async (offering) => {
          if (complete) {
            return await licensingService.getProductOfferingComplete(offering.id);
          } else if (withBundles) {
            return await licensingService.getProductOfferingWithBundles(offering.id);
          } else if (withFeatures) {
            return await licensingService.getProductOfferingWithFeatures(offering.id);
          }
          return offering;
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
 *
 * Body can include bundle_ids and feature_ids arrays to assign bundles and features during creation
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateProductOfferingDto & { bundle_ids?: string[]; feature_ids?: string[] } = await request.json();
    const licensingService = container.get<LicensingService>(TYPES.LicensingService);

    // Extract bundle_ids and feature_ids before creating the offering
    const bundleIds = body.bundle_ids;
    const featureIds = body.feature_ids;
    const offeringData = { ...body };
    delete (offeringData as any).bundle_ids;
    delete (offeringData as any).feature_ids;

    const offering = await licensingService.createProductOffering(offeringData);

    // Assign bundles if provided
    if (bundleIds && bundleIds.length > 0) {
      for (let i = 0; i < bundleIds.length; i++) {
        try {
          await licensingService.addBundleToOffering(offering.id, bundleIds[i], true, i);
        } catch (error) {
          console.error(`Failed to assign bundle ${bundleIds[i]} to offering:`, error);
          // Continue with other bundles even if one fails
        }
      }
    }

    // Assign features if provided
    if (featureIds && featureIds.length > 0) {
      for (const featureId of featureIds) {
        try {
          await licensingService.addFeatureToOffering(offering.id, featureId, true);
        } catch (error) {
          console.error(`Failed to assign feature ${featureId} to offering:`, error);
          // Continue with other features even if one fails
        }
      }
    }

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
