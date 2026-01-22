/**
 * ================================================================================
 * SINGLE DISBURSEMENT API ROUTE
 * ================================================================================
 *
 * GET /api/disbursements/[id] - Get disbursement details
 * POST /api/disbursements/[id] - Process disbursement (trigger payout)
 *
 * ================================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { getCurrentTenantId } from '@/lib/server/context';
import { DisbursementService } from '@/services/DisbursementService';

/**
 * GET /api/disbursements/[id]
 * Get disbursement details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = await getCurrentTenantId();
    const { id } = await params;

    const disbursementService = container.get<DisbursementService>(TYPES.DisbursementService);
    const disbursement = await disbursementService.getDisbursement(id, tenantId);

    if (!disbursement) {
      return NextResponse.json(
        { success: false, error: 'Disbursement not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: disbursement,
    });
  } catch (error) {
    console.error('[Disbursements API] Error getting disbursement:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to get disbursement' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/disbursements/[id]
 * Process disbursement (trigger payout via Xendit)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = await getCurrentTenantId();
    const { id } = await params;

    const disbursementService = container.get<DisbursementService>(TYPES.DisbursementService);
    const result = await disbursementService.processDisbursement(id, tenantId);

    return NextResponse.json({
      success: result.status === 'succeeded',
      data: result,
    });
  } catch (error) {
    console.error('[Disbursements API] Error processing disbursement:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to process disbursement' },
      { status: 500 }
    );
  }
}
