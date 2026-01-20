/**
 * ================================================================================
 * DISBURSEMENTS API ROUTE
 * ================================================================================
 *
 * GET /api/disbursements - List disbursements for tenant
 * POST /api/disbursements - Create a new disbursement
 *
 * ================================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';
import { DisbursementService } from '@/services/DisbursementService';

/**
 * GET /api/disbursements
 * List disbursements for the current tenant
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = await getCurrentTenantId();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;

    const disbursementService = container.get<DisbursementService>(TYPES.DisbursementService);
    const disbursements = await disbursementService.getDisbursements(tenantId, status);

    return NextResponse.json({
      success: true,
      data: disbursements,
    });
  } catch (error) {
    console.error('[Disbursements API] Error listing disbursements:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to list disbursements' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/disbursements
 * Create a new disbursement
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = await getCurrentTenantId();
    const userId = await getCurrentUserId();
    const body = await request.json();

    const { financial_source_id, period_start, period_end } = body;

    if (!financial_source_id) {
      return NextResponse.json(
        { success: false, error: 'Financial source ID is required' },
        { status: 400 }
      );
    }

    if (!period_start || !period_end) {
      return NextResponse.json(
        { success: false, error: 'Period start and end dates are required' },
        { status: 400 }
      );
    }

    const disbursementService = container.get<DisbursementService>(TYPES.DisbursementService);

    const disbursement = await disbursementService.createDisbursement(
      tenantId,
      financial_source_id,
      period_start,
      period_end,
      'manual',
      userId
    );

    return NextResponse.json(
      { success: true, data: disbursement },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Disbursements API] Error creating disbursement:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create disbursement' },
      { status: 500 }
    );
  }
}
