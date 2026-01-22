import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AICreditService } from '@/services/AICreditService';
import type { AuthorizationService } from '@/services/AuthorizationService';
import { tenantUtils } from '@/utils/tenantUtils';

/**
 * GET /api/ai-credits/balance
 * Returns current credit balance for authenticated tenant
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

    // Get credit service from DI container
    const creditService = container.get<AICreditService>(TYPES.AICreditService);

    // Fetch balance
    const balance = await creditService.getBalance(tenantId);

    return NextResponse.json({
      success: true,
      data: balance,
    });
  } catch (error) {
    console.error('[AI Credits Balance] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve credit balance',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
