import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { LicensingService } from '@/services/LicensingService';
import type { CreateLicenseFeatureBundleDto } from '@/models/licenseFeatureBundle.model';

/**
 * GET /api/licensing/feature-bundles
 * Retrieves license feature bundles filtered by category or type
 */
export async function GET(request: NextRequest) {
  try {
    const licensingService = container.get<LicensingService>(TYPES.LicensingService);

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const bundleType = searchParams.get('type');
    const withFeatures = searchParams.get('withFeatures') === 'true';

    let bundles;

    if (category) {
      bundles = await licensingService.getLicenseFeatureBundlesByCategory(category);
    } else if (bundleType) {
      bundles = await licensingService.getLicenseFeatureBundlesByType(bundleType);
    } else {
      bundles = await licensingService.getActiveLicenseFeatureBundles();
    }

    // Optionally enrich with features
    if (withFeatures && bundles.length > 0) {
      const enrichedBundles = await Promise.all(
        bundles.map(async (bundle) => {
          return await licensingService.getLicenseFeatureBundleWithFeatures(bundle.id);
        })
      );

      return NextResponse.json({
        success: true,
        data: enrichedBundles,
      });
    }

    return NextResponse.json({
      success: true,
      data: bundles,
    });
  } catch (error) {
    console.error('Error fetching license feature bundles:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch license feature bundles',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/licensing/feature-bundles
 * Creates a new license feature bundle
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateLicenseFeatureBundleDto = await request.json();
    const licensingService = container.get<LicensingService>(TYPES.LicensingService);

    const { feature_ids, ...bundleData } = body;
    const bundle = await licensingService.createLicenseFeatureBundle(bundleData);

    // Add features to the bundle if feature_ids are provided
    if (feature_ids && feature_ids.length > 0) {
      for (let i = 0; i < feature_ids.length; i++) {
        await licensingService.addFeatureToBundle(bundle.id, {
          feature_id: feature_ids[i],
          is_required: true,
          display_order: i,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: bundle,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating license feature bundle:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create license feature bundle',
      },
      { status: 500 }
    );
  }
}
