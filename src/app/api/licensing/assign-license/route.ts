import { NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { LicensingService } from '@/services/LicensingService';
import type { PermissionDeploymentService } from '@/services/PermissionDeploymentService';
import { authUtils } from '@/utils/authUtils';

/**
 * POST /api/licensing/assign-license
 *
 * Manually assigns a product offering to a tenant
 *
 * Request Body:
 * - tenantId: string - The tenant to assign the license to
 * - offeringId: string - The product offering to assign
 * - notes?: string - Optional notes about the assignment
 *
 * Response:
 * - success: boolean
 * - message: string
 * - data?: AssignmentResult
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

    // Get the licensing service
    const licensingService = container.get<LicensingService>(TYPES.LicensingService);

    // Assign the license
    const result = await licensingService.assignLicenseToTenant(
      tenantId,
      offeringId,
      user.id,
      notes
    );

    // ⭐ AUTO-SYNC: Deploy permissions for newly licensed features
    try {
      const permissionDeploymentService = container.get<PermissionDeploymentService>(
        TYPES.PermissionDeploymentService
      );

      const deploymentSummary = await permissionDeploymentService.syncTenantPermissions(tenantId);

      console.log(`Permission sync for tenant ${tenantId} after license assignment:`, {
        totalFeatures: deploymentSummary.totalFeatures,
        permissionsDeployed: deploymentSummary.totalPermissionsDeployed,
        roleAssignments: deploymentSummary.totalRoleAssignments,
        surfaceBindings: deploymentSummary.totalSurfaceBindings,
      });

      if (deploymentSummary.errors.length > 0) {
        console.warn('Permission sync warnings:', deploymentSummary.errors);
      }
    } catch (syncError) {
      console.error('Failed to sync permissions after license assignment:', syncError);
      // Non-fatal - license assignment still succeeded
    }

    return NextResponse.json({
      success: true,
      message: 'License assigned successfully and permissions synchronized',
      data: result,
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
