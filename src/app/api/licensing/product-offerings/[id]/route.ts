import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { LicensingService } from '@/services/LicensingService';
import { UpdateProductOfferingDto } from '@/models/productOffering.model';
import { checkSuperAdmin } from '@/utils/authUtils';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/licensing/product-offerings/:id
 * Retrieves a single product offering by ID
 *
 * Query params:
 * - withFeatures: Include individual features
 * - withBundles: Include bundles
 * - complete: Include both bundles and features
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const licensingService = container.get<LicensingService>(TYPES.LicensingService);

    const { searchParams } = new URL(request.url);
    const withFeatures = searchParams.get('withFeatures') === 'true';
    const withBundles = searchParams.get('withBundles') === 'true';
    const complete = searchParams.get('complete') === 'true';

    let offering;

    if (complete) {
      // Return everything: offering + bundles + features
      offering = await licensingService.getProductOfferingComplete(id);
    } else if (withBundles) {
      // Return offering + bundles
      offering = await licensingService.getProductOfferingWithBundles(id);
    } else if (withFeatures) {
      // Return offering + features
      offering = await licensingService.getProductOfferingWithFeatures(id);
    } else {
      // Return just the offering
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

/**
 * PUT /api/licensing/product-offerings/:id
 * Updates a product offering
 *
 * Body can include bundle_ids and feature_ids arrays to update assignments
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;
    const body: UpdateProductOfferingDto & { bundle_ids?: string[]; feature_ids?: string[] } = await request.json();
    const licensingService = container.get<LicensingService>(TYPES.LicensingService);

    // Extract bundle_ids and feature_ids before updating the offering
    const bundleIds = body.bundle_ids;
    const featureIds = body.feature_ids;
    const offeringData = { ...body };
    delete (offeringData as any).bundle_ids;
    delete (offeringData as any).feature_ids;

    // Update the offering
    const offering = await licensingService.updateProductOffering(id, offeringData);

    // Handle bundle updates if provided
    if (bundleIds !== undefined) {
      // Get current bundles
      const currentBundles = await licensingService.getOfferingBundles(id);
      const currentBundleIds = currentBundles.map((b: any) => b.id);

      // Determine changes
      const bundlesToAdd = bundleIds.filter(bundleId => !currentBundleIds.includes(bundleId));
      const bundlesToRemove = currentBundleIds.filter(bundleId => !bundleIds.includes(bundleId));

      // Remove bundles
      for (const bundleId of bundlesToRemove) {
        try {
          await licensingService.removeBundleFromOffering(id, bundleId);
        } catch (error) {
          console.error(`Failed to remove bundle ${bundleId}:`, error);
        }
      }

      // Add bundles
      for (let i = 0; i < bundlesToAdd.length; i++) {
        try {
          await licensingService.addBundleToOffering(id, bundlesToAdd[i], true, i);
        } catch (error) {
          console.error(`Failed to add bundle ${bundlesToAdd[i]}:`, error);
        }
      }
    }

    // Handle feature updates if provided
    if (featureIds !== undefined) {
      // Get current features
      const currentOffering = await licensingService.getProductOfferingWithFeatures(id);
      const currentFeatureIds = (currentOffering.features || []).map((f: any) => f.id);

      // Determine changes
      const featuresToAdd = featureIds.filter(featureId => !currentFeatureIds.includes(featureId));
      const featuresToRemove = currentFeatureIds.filter(featureId => !featureIds.includes(featureId));

      // Remove features
      for (const featureId of featuresToRemove) {
        try {
          await licensingService.removeFeatureFromOffering(id, featureId);
        } catch (error) {
          console.error(`Failed to remove feature ${featureId}:`, error);
        }
      }

      // Add features
      for (const featureId of featuresToAdd) {
        try {
          await licensingService.addFeatureToOffering(id, featureId, true);
        } catch (error) {
          console.error(`Failed to add feature ${featureId}:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: offering,
    });
  } catch (error) {
    console.error('Error updating product offering:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update product offering',
      },
      { status: 500 }
    );
  }
}
