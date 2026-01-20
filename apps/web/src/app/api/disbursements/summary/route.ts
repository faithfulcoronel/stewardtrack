/**
 * ================================================================================
 * DISBURSEMENT SUMMARY API ROUTE
 * ================================================================================
 *
 * GET /api/disbursements/summary - Get disbursement summary for tenant
 *
 * ================================================================================
 */

import { NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { getCurrentTenantId } from '@/lib/server/context';
import { DisbursementService } from '@/services/DisbursementService';

/**
 * GET /api/disbursements/summary
 * Get disbursement summary for the current tenant
 */
export async function GET() {
  try {
    const tenantId = await getCurrentTenantId();

    const disbursementService = container.get<DisbursementService>(TYPES.DisbursementService);
    const summary = await disbursementService.getDisbursementSummary(tenantId);

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('[Disbursements API] Error getting summary:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to get disbursement summary' },
      { status: 500 }
    );
  }
}
