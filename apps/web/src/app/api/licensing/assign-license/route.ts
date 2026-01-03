import { NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { ProductOfferingDeploymentService } from '@/services/ProductOfferingDeploymentService';
import { authUtils } from '@/utils/authUtils';

/**
 * POST /api/licensing/assign-license
 *
 * Assigns a product offering to a tenant using the ProductOfferingDeploymentService.
 * This service orchestrates the full deployment including:
 * - Granting/revoking features based on the new offering
 * - Syncing role permissions to match the new feature set
 *
 * Request Body:
 * - tenantId: string - The tenant to assign the license to
 * - offeringId: string - The product offering to assign
 * - notes?: string - Optional notes about the assignment
 *
 * Response:
 * - success: boolean
 * - message: string
 * - data?: TenantDeploymentResult
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
    const { tenantId, offeringId, notes } = body;

    // Validate required fields
    if (!tenantId || !offeringId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: tenantId and offeringId are required',
        },
        { status: 400 }
      );
    }

    // Get the ProductOfferingDeploymentService for orchestrated deployment
    const deploymentService = container.get<ProductOfferingDeploymentService>(
      TYPES.ProductOfferingDeploymentService
    );

    // Deploy the offering to the tenant
    // This handles feature grants/revokes and role permission sync in one orchestrated call
    const result = await deploymentService.deployOfferingToTenant(
      tenantId,
      offeringId,
      user.id,
      {
        syncRolePermissions: true,
        dryRun: false,
      }
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.errors.join(', ') || 'Failed to assign license',
        },
        { status: 500 }
      );
    }

    console.log(`License deployment for tenant ${tenantId}:`, {
      tenantName: result.tenantName,
      featuresGranted: result.featuresGranted,
      featuresRevoked: result.featuresRevoked,
      permissionsAdded: result.permissionsAdded,
      permissionsRemoved: result.permissionsRemoved,
      rolesUpdated: result.rolesUpdated,
    });

    return NextResponse.json({
      success: true,
      message: 'License assigned successfully and permissions synchronized',
      data: {
        assignment_id: tenantId, // For compatibility
        tenant_id: result.tenantId,
        tenant_name: result.tenantName,
        offering_id: offeringId,
        features_granted: result.featuresGranted,
        features_revoked: result.featuresRevoked,
        permissions_added: result.permissionsAdded,
        permissions_removed: result.permissionsRemoved,
        roles_updated: result.rolesUpdated,
      },
    });
  } catch (error) {
    console.error('Error assigning license:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to assign license',
      },
      { status: 500 }
    );
  }
}
