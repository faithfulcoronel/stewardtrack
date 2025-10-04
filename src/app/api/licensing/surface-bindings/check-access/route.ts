import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { LicensingService } from '@/services/LicensingService';
import { tenantUtils } from '@/utils/tenantUtils';

/**
 * POST /api/licensing/surface-bindings/check-access
 * Checks if a user can access a specific surface (RBAC + licensing combined)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, surfaceId, tenantId: bodyTenantId } = body;

    if (!userId || !surfaceId) {
      return NextResponse.json(
        {
          success: false,
          error: 'userId and surfaceId are required',
        },
        { status: 400 }
      );
    }

    const licensingService = container.get<LicensingService>(TYPES.LicensingService);
    const tenantId = bodyTenantId || await tenantUtils.getTenantId();

    if (!tenantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'No tenant context available',
        },
        { status: 400 }
      );
    }

    const accessResult = await licensingService.checkSurfaceAccess(userId, surfaceId, tenantId);

    return NextResponse.json({
      success: true,
      data: accessResult,
    });
  } catch (error) {
    console.error('Error checking surface access:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check surface access',
      },
      { status: 500 }
    );
  }
}
