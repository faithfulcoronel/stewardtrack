import { NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { LicensingService } from '@/services/LicensingService';
import { authUtils } from '@/utils/authUtils';

/**
 * GET /api/licensing/tenants
 *
 * Gets all tenants available for license assignment
 *
 * Response:
 * - success: boolean
 * - data?: TenantForAssignment[]
 * - error?: string
 */
export async function GET() {
  try {
    // Verify user is authenticated
    const user = await authUtils.getUser();
    if (!user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the licensing service
    const licensingService = container.get<LicensingService>(TYPES.LicensingService);

    // Get all tenants for assignment
    const tenants = await licensingService.getTenantsForAssignment();

    return NextResponse.json({
      success: true,
      data: tenants,
    });
  } catch (error) {
    console.error('Error getting tenants for assignment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get tenants',
      },
      { status: 500 }
    );
  }
}
