import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { LicensingService } from '@/services/LicensingService';
import { tenantUtils } from '@/utils/tenantUtils';

/**
 * GET /api/licensing/surface-bindings
 * Retrieves effective surface access for the current tenant (combining RBAC + licensing)
 */
export async function GET(request: NextRequest) {
  try {
    const licensingService = container.get<LicensingService>(TYPES.LicensingService);

    const { searchParams } = new URL(request.url);
    const bundleId = searchParams.get('bundleId');
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

    // If bundleId is provided, get surfaces requiring that bundle
    if (bundleId) {
      const surfaces = await licensingService.getSurfacesByLicenseBundle(bundleId);

      return NextResponse.json({
        success: true,
        data: surfaces,
      });
    }

    // Otherwise, get effective surface access for the tenant
    const effectiveAccess = await licensingService.getEffectiveSurfaceAccess(tenantId);

    return NextResponse.json({
      success: true,
      data: effectiveAccess,
    });
  } catch (error) {
    console.error('Error fetching surface bindings:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch surface bindings',
      },
      { status: 500 }
    );
  }
}
