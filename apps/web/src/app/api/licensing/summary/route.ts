import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { LicensingService } from '@/services/LicensingService';
import { tenantUtils } from '@/utils/tenantUtils';

/**
 * GET /api/licensing/summary
 * Gets a complete licensing summary for a tenant including:
 * - Active product offerings
 * - Licensed feature bundles
 * - Accessible surfaces
 * - Effective access permissions
 */
export async function GET(request: NextRequest) {
  try {
    const licensingService = container.get<LicensingService>(TYPES.LicensingService);

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || await tenantUtils.getTenantId();

    if (!tenantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'No tenant context available',
        },
        { status: 400 }
      );
    }

    const summary = await licensingService.getTenantLicensingSummary(tenantId);

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Error fetching licensing summary:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch licensing summary',
      },
      { status: 500 }
    );
  }
}
