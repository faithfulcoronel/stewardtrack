import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { LicensingService } from '@/services/LicensingService';
import type { UpdateLicenseFeatureBundleDto, AssignFeatureToBundleDto } from '@/models/licenseFeatureBundle.model';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/licensing/feature-bundles/[id]
 * Retrieves a specific license feature bundle by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Await params in Next.js 15
    const { id } = await params;

    const licensingService = container.get<LicensingService>(TYPES.LicensingService);

    const { searchParams } = new URL(request.url);
    const withFeatures = searchParams.get('withFeatures') === 'true';

    const bundle = withFeatures
      ? await licensingService.getLicenseFeatureBundleWithFeatures(id)
      : await licensingService.getLicenseFeatureBundle(id);

    if (!bundle) {
      return NextResponse.json(
        {
          success: false,
          error: 'License feature bundle not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: bundle,
    });
  } catch (error) {
    console.error('Error fetching license feature bundle:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch license feature bundle',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/licensing/feature-bundles/[id]
 * Updates a license feature bundle
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // Await params in Next.js 15
    const { id } = await params;

    const body: UpdateLicenseFeatureBundleDto = await request.json();
    const licensingService = container.get<LicensingService>(TYPES.LicensingService);

    const { feature_ids, ...bundleData } = body;
    const bundle = await licensingService.updateLicenseFeatureBundle(id, bundleData);

    // Update features if feature_ids are provided
    if (feature_ids !== undefined) {
      // Get current bundle features
      const bundleWithFeatures = await licensingService.getLicenseFeatureBundleWithFeatures(id);
      const currentFeatureIds = bundleWithFeatures?.features?.map(f => f.id) || [];

      // Remove features that are no longer selected
      for (const featureId of currentFeatureIds) {
        if (!feature_ids.includes(featureId)) {
          await licensingService.removeFeatureFromBundle(id, featureId);
        }
      }

      // Add new features
      for (let i = 0; i < feature_ids.length; i++) {
        const featureId = feature_ids[i];
        if (!currentFeatureIds.includes(featureId)) {
          await licensingService.addFeatureToBundle(id, {
            feature_id: featureId,
            is_required: true,
            display_order: i,
          });
        } else {
          // Update display order for existing features
          await licensingService.updateFeatureOrderInBundle(id, featureId, i);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: bundle,
    });
  } catch (error) {
    console.error('Error updating license feature bundle:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update license feature bundle',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/licensing/feature-bundles/[id]
 * Deletes a license feature bundle
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Await params in Next.js 15
    const { id } = await params;

    const licensingService = container.get<LicensingService>(TYPES.LicensingService);

    await licensingService.deleteLicenseFeatureBundle(id);

    return NextResponse.json({
      success: true,
      message: 'License feature bundle deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting license feature bundle:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete license feature bundle',
      },
      { status: 500 }
    );
  }
}
