import { NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { ProductOfferingDeploymentService } from '@/services/ProductOfferingDeploymentService';
import { authUtils } from '@/utils/authUtils';

/**
 * POST /api/licensing/deployment
 *
 * Deploys a product offering to one or more tenants with full orchestration including:
 * - Cleanup of orphaned feature grants
 * - Feature grant/revoke based on offering
 * - Role permission synchronization
 *
 * Request Body:
 * - offeringId: string - The product offering to deploy
 * - targetTenantIds?: string[] - Specific tenant IDs (optional, defaults to all eligible tenants)
 * - cleanupOrphanedGrants?: boolean - Whether to cleanup orphaned grants (default: true)
 * - syncRolePermissions?: boolean - Whether to sync role permissions (default: true)
 * - dryRun?: boolean - Whether to simulate without making changes (default: false)
 *
 * Response:
 * - success: boolean
 * - data: FullDeploymentResult
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

    // Parse request body
    const body = await request.json();
    const {
      offeringId,
      targetTenantIds,
      cleanupOrphanedGrants = true,
      syncRolePermissions = true,
      dryRun = false,
    } = body;

    // Validate required fields
    if (!offeringId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: offeringId',
        },
        { status: 400 }
      );
    }

    // Get the deployment service
    const deploymentService = container.get<ProductOfferingDeploymentService>(
      TYPES.ProductOfferingDeploymentService
    );

    // Deploy to all tenants
    const result = await deploymentService.deployOfferingToAllTenants(
      offeringId,
      user.id,
      {
        targetTenantIds,
        cleanupOrphanedGrants,
        syncRolePermissions,
        dryRun,
      }
    );

    return NextResponse.json({
      success: result.success,
      message: dryRun
        ? 'Dry run completed - no changes made'
        : `Deployment completed: ${result.summary.successfulDeployments} successful, ${result.summary.failedDeployments} failed`,
      data: result,
    });
  } catch (error) {
    console.error('Error deploying product offering:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to deploy product offering',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/licensing/deployment/validate
 *
 * Validates a deployment before executing
 *
 * Query Parameters:
 * - offeringId: string - The product offering to validate
 * - tenantIds?: string - Comma-separated tenant IDs (optional)
 *
 * Response:
 * - success: boolean
 * - data: ValidationResult
 */
export async function GET(request: Request) {
  try {
    // Verify user is authenticated
    const user = await authUtils.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const offeringId = searchParams.get('offeringId');
    const tenantIdsParam = searchParams.get('tenantIds');
    const tenantIds = tenantIdsParam ? tenantIdsParam.split(',').filter(Boolean) : undefined;

    // Validate required fields
    if (!offeringId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required query parameter: offeringId',
        },
        { status: 400 }
      );
    }

    // Get the deployment service
    const deploymentService = container.get<ProductOfferingDeploymentService>(
      TYPES.ProductOfferingDeploymentService
    );

    // Validate the deployment
    const result = await deploymentService.validateDeployment(offeringId, tenantIds);

    return NextResponse.json({
      success: result.valid,
      data: result,
    });
  } catch (error) {
    console.error('Error validating deployment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate deployment',
      },
      { status: 500 }
    );
  }
}
