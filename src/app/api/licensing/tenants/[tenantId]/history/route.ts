import { NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { LicensingService } from '@/services/LicensingService';
import { getServerSession } from '@/lib/authUtils';

/**
 * GET /api/licensing/tenants/[tenantId]/history
 *
 * Gets the license assignment history for a specific tenant
 *
 * URL Parameters:
 * - tenantId: string - The tenant ID
 *
 * Response:
 * - success: boolean
 * - data?: LicenseHistoryEntry[]
 * - error?: string
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ tenantId: string }> }
) {
  try {
    // Verify user is authenticated
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Await params (Next.js 15 pattern)
    const params = await context.params;
    const { tenantId } = params;

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Missing tenantId parameter' },
        { status: 400 }
      );
    }

    // Get the licensing service
    const licensingService = container.get<LicensingService>(TYPES.LicensingService);

    // Get tenant license history
    const history = await licensingService.getTenantLicenseHistory(tenantId);

    return NextResponse.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error('Error getting tenant license history:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get license history',
      },
      { status: 500 }
    );
  }
}
