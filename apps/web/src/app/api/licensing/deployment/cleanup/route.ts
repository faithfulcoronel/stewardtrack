import { NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { ProductOfferingDeploymentService } from '@/services/ProductOfferingDeploymentService';
import { authUtils } from '@/utils/authUtils';

/**
 * POST /api/licensing/deployment/cleanup
 *
 * Cleans up orphaned feature grants for tenants without assigned product offerings
 *
 * When a tenant has no product offering assigned (subscription_offering_id is null),
 * any existing feature grants are considered orphaned and should be removed.
 *
 * Response:
 * - success: boolean
 * - data: OrphanedGrantCleanupResult
 */
export async function POST(request: Request) {
  try {
    // Verify user is authenticated
    const user = await authUtils.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the deployment service
    const deploymentService = container.get<ProductOfferingDeploymentService>(
      TYPES.ProductOfferingDeploymentService
    );

    // Run cleanup
    const result = await deploymentService.cleanupOrphanedFeatureGrants();

    return NextResponse.json({
      success: result.success,
      message: `Cleanup completed: ${result.tenantsProcessed} tenants processed, ${result.grantsRemoved} grants removed`,
      data: result,
    });
  } catch (error) {
    console.error('Error cleaning up orphaned grants:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cleanup orphaned grants',
      },
      { status: 500 }
    );
  }
}
