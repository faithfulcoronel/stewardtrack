import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AICreditService } from '@/services/AICreditService';
import type { AuthorizationService } from '@/services/AuthorizationService';
import { tenantUtils } from '@/utils/tenantUtils';

/**
 * GET /api/ai-credits/auto-recharge
 * Returns current auto-recharge configuration
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get tenant ID
    const tenantId = await tenantUtils.getTenantId();

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context not found' },
        { status: 400 }
      );
    }

    // Get credit service
    const creditService = container.get<AICreditService>(TYPES.AICreditService);

    // Get balance (includes auto-recharge config)
    const balance = await creditService.getBalance(tenantId);

    return NextResponse.json({
      success: true,
      data: {
        enabled: balance.auto_recharge_enabled,
        packageId: balance.auto_recharge_package_id,
        threshold: balance.low_credit_threshold,
      },
    });
  } catch (error) {
    console.error('[AI Credits Auto-Recharge GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve auto-recharge configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai-credits/auto-recharge
 * Configures auto-recharge settings
 *
 * Request body:
 * {
 *   enabled: boolean,
 *   packageId?: string | null,
 *   threshold?: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get tenant ID
    const tenantId = await tenantUtils.getTenantId();

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context not found' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { enabled, packageId, threshold } = body;

    // Validate input
    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'enabled must be a boolean' },
        { status: 400 }
      );
    }

    if (enabled && !packageId) {
      return NextResponse.json(
        { success: false, error: 'packageId is required when enabling auto-recharge' },
        { status: 400 }
      );
    }

    if (threshold !== undefined && (typeof threshold !== 'number' || threshold < 0)) {
      return NextResponse.json(
        { success: false, error: 'threshold must be a non-negative number' },
        { status: 400 }
      );
    }

    // Get credit service
    const creditService = container.get<AICreditService>(TYPES.AICreditService);

    // Configure auto-recharge
    await creditService.configureAutoRecharge(tenantId, {
      enabled,
      package_id: enabled ? packageId : null,
      threshold: threshold ?? 10,
    });

    return NextResponse.json({
      success: true,
      message: 'Auto-recharge configuration updated',
    });
  } catch (error) {
    console.error('[AI Credits Auto-Recharge POST] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update auto-recharge configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
