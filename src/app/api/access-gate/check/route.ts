/**
 * Access Gate Check API Route
 *
 * Unified API endpoint for checking access from client components
 */

import { NextRequest, NextResponse } from 'next/server';
import { Gate } from '@/lib/access-gate';

/**
 * POST /api/access-gate/check
 * Checks access based on the provided gate configuration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, tenantId, type, ...params } = body;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'userId is required',
        },
        { status: 400 }
      );
    }

    let gate;

    // Create appropriate gate based on type
    switch (type) {
      case 'surface':
        if (!params.surfaceId) {
          return NextResponse.json(
            { success: false, error: 'surfaceId is required for surface type' },
            { status: 400 }
          );
        }
        gate = Gate.forSurface(params.surfaceId);
        break;

      case 'permission':
        if (!params.permissions) {
          return NextResponse.json(
            { success: false, error: 'permissions is required for permission type' },
            { status: 400 }
          );
        }
        gate = Gate.withPermission(params.permissions, params.permissionMode || 'all');
        break;

      case 'role':
        if (!params.roles) {
          return NextResponse.json(
            { success: false, error: 'roles is required for role type' },
            { status: 400 }
          );
        }
        gate = Gate.withRole(params.roles, params.roleMode || 'any');
        break;

      case 'license':
        if (!params.featureCode) {
          return NextResponse.json(
            { success: false, error: 'featureCode is required for license type' },
            { status: 400 }
          );
        }
        gate = Gate.withLicense(params.featureCode);
        break;

      case 'superAdmin':
        gate = Gate.superAdminOnly();
        break;

      case 'authenticated':
        gate = Gate.authenticated();
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid gate type' },
          { status: 400 }
        );
    }

    // Perform access check
    const result = await gate.check(userId, tenantId);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error checking access:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check access',
      },
      { status: 500 }
    );
  }
}
