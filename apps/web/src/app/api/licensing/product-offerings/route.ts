import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { LicensingService } from '@/services/LicensingService';
import type { IAuthRepository } from '@/repositories/auth.repository';
import type {
  CreateProductOfferingDto,
  ProductOfferingWithFeatures,
  ProductOfferingWithBundles,
  ProductOfferingComplete,
} from '@/models/productOffering.model';

function parseBooleanParam(value: string | null): boolean {
  return value === 'true';
}

async function enrichOfferingsForAuthenticatedRequest(
  licensingService: LicensingService,
  offerings: ProductOfferingWithFeatures[],
  options: { includeFeatures: boolean; includeBundles: boolean; complete: boolean }
): Promise<Array<ProductOfferingWithFeatures | ProductOfferingWithBundles | ProductOfferingComplete>> {
  const { includeFeatures, includeBundles, complete } = options;

  if (!offerings.length || (!includeFeatures && !includeBundles && !complete)) {
    return offerings;
  }

  const enriched = await Promise.all(
    offerings.map(async (offering) => {
      if (complete) {
        return (await licensingService.getProductOfferingComplete(offering.id)) as ProductOfferingComplete;
      }
      if (includeBundles) {
        return (await licensingService.getProductOfferingWithBundles(offering.id)) as ProductOfferingWithBundles;
      }
      if (includeFeatures) {
        return (await licensingService.getProductOfferingWithFeatures(offering.id)) as ProductOfferingWithFeatures;
      }
      return offering;
    })
  );

  return enriched;
}

/**
 * GET /api/licensing/product-offerings
 * Retrieves product offerings for both authenticated and unauthenticated flows.
 *
 * Query params:
 * - tier: Filter by tier
 * - withFeatures: Include individual features
 * - withBundles: Include bundles
 * - complete: Include both bundles and features, plus counts
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tier = searchParams.get('tier');
    const withFeatures = parseBooleanParam(searchParams.get('withFeatures'));
    const withBundles = parseBooleanParam(searchParams.get('withBundles'));
    const complete = parseBooleanParam(searchParams.get('complete'));

    const includeFeatures = complete || withFeatures;
    const includeBundles = complete || withBundles;

    const authRepository = container.get<IAuthRepository>(TYPES.IAuthRepository);
    const { data: userData } = await authRepository.getUser();
    const isAuthenticated = !!userData?.user;

    if (!isAuthenticated) {
      const licensingService = container.get<LicensingService>(TYPES.LicensingService);
      const publicOfferings = await licensingService.getPublicProductOfferings({
        includeFeatures,
        includeBundles,
        tier,
        targetId: null,
      });

      return NextResponse.json({
        success: true,
        data: publicOfferings,
      });
    }

    const licensingService = container.get<LicensingService>(TYPES.LicensingService);

    let offerings: ProductOfferingWithFeatures[];

    if (tier) {
      offerings = await licensingService.getProductOfferingsByTier(tier);
    } else {
      offerings = await licensingService.getActiveProductOfferings();
    }

    const enrichedOfferings = await enrichOfferingsForAuthenticatedRequest(licensingService, offerings, {
      includeFeatures,
      includeBundles,
      complete,
    });

    return NextResponse.json({
      success: true,
      data: enrichedOfferings,
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

    return NextResponse.json(
      {
        success: true,
        data: offering,
      },
      { status: 201 }
    );
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
