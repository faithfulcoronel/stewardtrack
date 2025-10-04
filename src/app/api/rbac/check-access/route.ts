/**
 * RBAC + Licensing Combined Access Check API
 *
 * Provides endpoints to verify user access to surfaces based on both
 * RBAC permissions and licensing state.
 *
 * POST /api/rbac/check-access
 * - Checks if a user can access a specific surface
 * - Returns detailed access information including RBAC and license status
 */

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { UserRoleService } from '@/services/UserRoleService';
import type { LicensingService } from '@/services/LicensingService';
import { tenantUtils } from '@/utils/tenantUtils';

interface CheckAccessRequest {
  userId: string;
  surfaceId: string;
  tenantId?: string;
}

interface CheckAccessResponse {
  success: boolean;
  hasAccess: boolean;
  hasRbac: boolean;
  hasLicense: boolean;
  reason?: string;
  error?: string;
}

/**
 * POST /api/rbac/check-access
 * Check if a user can access a surface (RBAC + licensing)
 */
export async function POST(request: NextRequest): Promise<NextResponse<CheckAccessResponse>> {
  try {
    const body: CheckAccessRequest = await request.json();
    const { userId, surfaceId, tenantId } = body;

    // Validate required fields
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        {
          success: false,
          hasAccess: false,
          hasRbac: false,
          hasLicense: false,
          error: 'userId is required and must be a string',
        },
        { status: 400 }
      );
    }

    if (!surfaceId || typeof surfaceId !== 'string') {
      return NextResponse.json(
        {
          success: false,
          hasAccess: false,
          hasRbac: false,
          hasLicense: false,
          error: 'surfaceId is required and must be a string',
        },
        { status: 400 }
      );
    }

    // Resolve tenant ID
    const effectiveTenantId = tenantId || (await tenantUtils.getTenantId());
    if (!effectiveTenantId) {
      return NextResponse.json(
        {
          success: false,
          hasAccess: false,
          hasRbac: false,
          hasLicense: false,
          error: 'No tenant context available',
        },
        { status: 400 }
      );
    }

    // Get services from DI container
    const userRoleService = container.get<UserRoleService>(TYPES.UserRoleService);
    const licensingService = container.get<LicensingService>(TYPES.LicensingService);

    // Check RBAC permission
    const rbacSurfaces = await userRoleService.getUserAccessibleMetadataSurfaces(userId, effectiveTenantId);
    const hasRbac = rbacSurfaces.some((surface: any) => surface.id === surfaceId);

    // Check licensing
    const licenseResult = await licensingService.checkSurfaceAccess(userId, surfaceId, effectiveTenantId);
    const hasLicense = licenseResult.hasAccess;

    // Determine overall access
    const hasAccess = hasRbac && hasLicense;

    // Determine reason if access is denied
    let reason: string | undefined;
    if (!hasAccess) {
      if (!hasRbac) {
        reason = 'Insufficient RBAC permissions';
      } else if (!hasLicense) {
        reason = 'License upgrade required';
      }
    }

    return NextResponse.json({
      success: true,
      hasAccess,
      hasRbac,
      hasLicense,
      reason,
    });
  } catch (error) {
    console.error('Error checking access:', error);
    return NextResponse.json(
      {
        success: false,
        hasAccess: false,
        hasRbac: false,
        hasLicense: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/rbac/check-access?userId={userId}&surfaceId={surfaceId}&tenantId={tenantId}
 * Alternative GET endpoint for simple access checks
 */
export async function GET(request: NextRequest): Promise<NextResponse<CheckAccessResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const surfaceId = searchParams.get('surfaceId');
    const tenantId = searchParams.get('tenantId') || undefined;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          hasAccess: false,
          hasRbac: false,
          hasLicense: false,
          error: 'userId query parameter is required',
        },
        { status: 400 }
      );
    }

    if (!surfaceId) {
      return NextResponse.json(
        {
          success: false,
          hasAccess: false,
          hasRbac: false,
          hasLicense: false,
          error: 'surfaceId query parameter is required',
        },
        { status: 400 }
      );
    }

    // Resolve tenant ID
    const effectiveTenantId = tenantId || (await tenantUtils.getTenantId());
    if (!effectiveTenantId) {
      return NextResponse.json(
        {
          success: false,
          hasAccess: false,
          hasRbac: false,
          hasLicense: false,
          error: 'No tenant context available',
        },
        { status: 400 }
      );
    }

    // Get services from DI container
    const userRoleService = container.get<UserRoleService>(TYPES.UserRoleService);
    const licensingService = container.get<LicensingService>(TYPES.LicensingService);

    // Check RBAC permission
    const rbacSurfaces = await userRoleService.getUserAccessibleMetadataSurfaces(userId, effectiveTenantId);
    const hasRbac = rbacSurfaces.some((surface: any) => surface.id === surfaceId);

    // Check licensing
    const licenseResult = await licensingService.checkSurfaceAccess(userId, surfaceId, effectiveTenantId);
    const hasLicense = licenseResult.hasAccess;

    // Determine overall access
    const hasAccess = hasRbac && hasLicense;

    // Determine reason if access is denied
    let reason: string | undefined;
    if (!hasAccess) {
      if (!hasRbac) {
        reason = 'Insufficient RBAC permissions';
      } else if (!hasLicense) {
        reason = 'License upgrade required';
      }
    }

    return NextResponse.json({
      success: true,
      hasAccess,
      hasRbac,
      hasLicense,
      reason,
    });
  } catch (error) {
    console.error('Error checking access:', error);
    return NextResponse.json(
      {
        success: false,
        hasAccess: false,
        hasRbac: false,
        hasLicense: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
