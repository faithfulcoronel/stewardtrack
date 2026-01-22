import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AICreditTransactionRepository } from '@/repositories/aiCreditTransaction.repository';
import type { AuthorizationService } from '@/services/AuthorizationService';
import { tenantUtils } from '@/utils/tenantUtils';

/**
 * GET /api/ai-credits/transactions?page=1&limit=20
 * Returns paginated transaction history for authenticated tenant
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

    // Parse pagination params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Validate pagination params
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { success: false, error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    const offset = (page - 1) * limit;

    // Get transaction repository
    const transactionRepo = container.get<AICreditTransactionRepository>(
      TYPES.IAICreditTransactionRepository
    );

    // Fetch transactions
    const transactions = await transactionRepo.getTenantTransactions(
      tenantId,
      limit,
      offset
    );

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page,
          limit,
          hasMore: transactions.length === limit,
        },
      },
    });
  } catch (error) {
    console.error('[AI Credits Transactions] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve transactions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
