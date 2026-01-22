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
 * GET /api/licensing/feature-bundles/[id]/features
 * Retrieves features for a specific license feature bundle
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Await params in Next.js 15
    const { id } = await params;

    const licensingService = container.get<LicensingService>(TYPES.LicensingService);

    const bundleWithFeatures = await licensingService.getLicenseFeatureBundleWithFeatures(id);

    if (!bundleWithFeatures) {
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
      data: bundleWithFeatures.features || [],
    });
  } catch (error) {
    console.error('Error fetching bundle features:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch bundle features',
      },
      { status: 500 }
    );
  }
}
