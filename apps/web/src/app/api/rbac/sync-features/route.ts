import { NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';
import type { LicensingService } from '@/services/LicensingService';

/**
 * POST /api/rbac/sync-features
 *
 * Syncs the current tenant's feature grants and permissions with their
 * product subscription offering. This ensures the tenant has all features
 * included in their offering, including any newly added features.
 *
 * Use this when:
 * - New features have been added to a product offering
 * - A tenant is missing expected features or permissions
 * - After registration if some features weren't deployed properly
 *
 * Requires: User must be authenticated and have a tenant context
 */
export async function POST() {
  try {
    // Verify user is authenticated and has tenant context
    const userId = await getCurrentUserId();
    const tenantId = await getCurrentTenantId();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'No tenant context available' },
        { status: 400 }
      );
    }

    // Get the licensing service and sync features
    const licensingService = container.get<LicensingService>(TYPES.LicensingService);
    const result = await licensingService.syncTenantSubscriptionFeatures(tenantId);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Feature sync failed',
        },
        { status: 500 }
      );
    }

    // Build summary message
    const changes = [];
    if (result.features_added > 0) changes.push(`${result.features_added} features added`);
    if (result.permissions_deployed > 0) changes.push(`${result.permissions_deployed} permissions deployed`);
    if (result.roles_created > 0) changes.push(`${result.roles_created} roles created`);
    if (result.role_assignments_created > 0) changes.push(`${result.role_assignments_created} role assignments`);

    const message = changes.length > 0
      ? `Sync complete: ${changes.join(', ')}`
      : 'All features and permissions are already in sync';

    return NextResponse.json({
      success: true,
      data: {
        offering_id: result.offering_id,
        offering_tier: result.offering_tier,
        features_added: result.features_added,
        features_already_granted: result.features_already_granted,
        permissions_deployed: result.permissions_deployed,
        permissions_already_exist: result.permissions_already_exist,
        role_assignments_created: result.role_assignments_created,
        roles_created: result.roles_created,
        message,
      },
    });
  } catch (error) {
    console.error('[sync-features] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync features',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/rbac/sync-features
 *
 * Returns information about the feature sync endpoint.
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      description: 'Syncs tenant feature grants and permissions with their product subscription',
      method: 'POST',
      endpoint: '/api/rbac/sync-features',
    },
  });
}
