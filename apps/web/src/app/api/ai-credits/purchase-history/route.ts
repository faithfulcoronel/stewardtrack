import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AICreditPurchaseService } from '@/services/AICreditPurchaseService';
import type { AuthorizationService } from '@/services/AuthorizationService';
import { tenantUtils } from '@/utils/tenantUtils';

/**
 * GET /api/ai-credits/purchase-history?page=1&limit=20&status=completed
 * Returns paginated purchase history for authenticated tenant
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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status') as 'pending' | 'paid' | 'completed' | 'failed' | 'expired' | null;

    // Validate pagination params
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { success: false, error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    // Validate status if provided
    if (status && !['pending', 'paid', 'completed', 'failed', 'expired'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status filter' },
        { status: 400 }
      );
    }

    const offset = (page - 1) * limit;

    // Get purchase service
    const purchaseService = container.get<AICreditPurchaseService>(
      TYPES.AICreditPurchaseService
    );

    // Fetch purchase history
    const purchases = await purchaseService.getPurchaseHistory(tenantId, {
      status: status || undefined,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      data: {
        purchases,
        pagination: {
          page,
          limit,
          hasMore: purchases.length === limit,
        },
      },
    });
  } catch (error) {
    console.error('[AI Credits Purchase History] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve purchase history',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
