import { NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { LicensingService } from '@/services/LicensingService';
import { getServerSession } from '@/lib/authUtils';

/**
 * GET /api/licensing/feature-changes
 *
 * Gets a preview of feature changes for a potential license assignment
 *
 * Query Parameters:
 * - tenantId: string - The tenant ID
 * - offeringId: string - The offering ID
 *
 * Response:
 * - success: boolean
 * - data?: FeatureChangeSummary
 * - error?: string
 */
export async function GET(request: Request) {
  try {
    // Verify user is authenticated
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const offeringId = searchParams.get('offeringId');

    if (!tenantId || !offeringId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: tenantId and offeringId' },
        { status: 400 }
      );
    }

    // Get the licensing service
    const licensingService = container.get<LicensingService>(TYPES.LicensingService);

    // Get feature change summary
    const summary = await licensingService.getFeatureChangeSummary(tenantId, offeringId);

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Error getting feature changes:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get feature changes',
      },
      { status: 500 }
    );
  }
}
