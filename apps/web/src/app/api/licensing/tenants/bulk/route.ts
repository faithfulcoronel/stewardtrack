import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { AuthorizationService } from '@/services/AuthorizationService';
import type { LicensingService } from '@/services/LicensingService';

/**
 * DELETE /api/licensing/tenants/bulk
 *
 * Bulk delete tenants and all associated data.
 * Requires super-admin privileges.
 *
 * Request body:
 * {
 *   tenant_ids: string[]  // Array of tenant UUIDs to delete
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   data?: {
 *     total_tenants_deleted: number,
 *     auth_users_deleted: number,
 *     deleted: Array<{ tenant_id: string, status: 'deleted' | 'failed', error?: string }>
 *   },
 *   error?: string
 * }
 */
export async function DELETE(request: NextRequest) {
  try {
    // Require super-admin authorization
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.requireSuperAdmin();

    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const { tenant_ids } = body;

    if (!tenant_ids || !Array.isArray(tenant_ids) || tenant_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tenant IDs array is required' },
        { status: 400 }
      );
    }

    // Validate UUIDs format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const invalidIds = tenant_ids.filter((id: string) => !uuidRegex.test(id));

    if (invalidIds.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid UUID format for tenant IDs: ${invalidIds.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Get the licensing service and perform bulk deletion
    const licensingService = container.get<LicensingService>(TYPES.LicensingService);
    const result = await licensingService.bulkDeleteTenants(tenant_ids);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'No tenants were deleted',
          data: result,
        },
        { status: 500 }
      );
    }

    // Log the deletion for audit purposes
    console.log(
      `[BULK TENANT DELETION] User ${authResult.userId} deleted ${result.total_tenants_deleted} tenant(s), ` +
        `${result.auth_users_deleted} auth user(s) removed`
    );

    return NextResponse.json({
      success: true,
      data: result,
      message: `Successfully deleted ${result.total_tenants_deleted} tenant(s)`,
    });
  } catch (error) {
    console.error('Error in bulk tenant deletion:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete tenants',
      },
      { status: 500 }
    );
  }
}
