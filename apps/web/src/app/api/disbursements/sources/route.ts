/**
 * ================================================================================
 * PAYOUT SOURCES API ROUTE
 * ================================================================================
 *
 * GET /api/disbursements/sources - Get financial sources configured for payouts
 *
 * These are financial sources with Xendit payout channels configured.
 * Bank account details are managed in Xendit Dashboard, not stored in StewardTrack.
 *
 * ================================================================================
 */

import { NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { getCurrentTenantId } from '@/lib/server/context';
import { DisbursementService } from '@/services/DisbursementService';

/**
 * GET /api/disbursements/sources
 * Get financial sources configured for payouts
 */
export async function GET() {
  try {
    const tenantId = await getCurrentTenantId();

    const disbursementService = container.get<DisbursementService>(TYPES.DisbursementService);
    const sources = await disbursementService.getPayoutSources(tenantId);

    return NextResponse.json({
      success: true,
      data: sources,
    });
  } catch (error) {
    console.error('[Disbursements API] Error getting payout sources:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to get payout sources' },
      { status: 500 }
    );
  }
}
