/**
 * ================================================================================
 * PAYOUT CONFIGURATION API ROUTE
 * ================================================================================
 *
 * Manages bank payout configuration for financial sources.
 * Used to configure bank account details for donation disbursements.
 *
 * GET /api/finance/sources/[sourceId]/payout-config
 *   Get payout configuration (with masked account number)
 *
 * PUT /api/finance/sources/[sourceId]/payout-config
 *   Update payout configuration
 *
 * DELETE /api/finance/sources/[sourceId]/payout-config
 *   Clear payout configuration
 *
 * ================================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { FinancialSourceService } from '@/services/FinancialSourceService';
import { getCurrentUserId, getCurrentTenantId } from '@/lib/server/context';
import type { UpdatePayoutConfigDto } from '@/models/financialSource.model';
import type { DisbursementSchedule } from '@/models/disbursement.model';

type RouteParams = {
  params: Promise<{ sourceId: string }>;
};

/**
 * GET /api/finance/sources/[sourceId]/payout-config
 * Get payout configuration with masked account number
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { sourceId } = await params;
    await getCurrentUserId(); // Ensure authenticated
    const tenantId = await getCurrentTenantId();

    const financialSourceService = container.get<FinancialSourceService>(TYPES.FinancialSourceService);

    const config = await financialSourceService.getPayoutConfiguration(sourceId, tenantId);

    if (!config) {
      return NextResponse.json({ error: 'Financial source not found' }, { status: 404 });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('[GET /api/finance/sources/[sourceId]/payout-config]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get payout configuration' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/finance/sources/[sourceId]/payout-config
 * Update payout configuration
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { sourceId } = await params;
    await getCurrentUserId(); // Ensure authenticated
    const tenantId = await getCurrentTenantId();

    const body = await request.json();

    // Validate required fields
    const {
      xendit_channel_code,
      bank_account_holder_name,
      bank_account_number,
      disbursement_schedule,
      disbursement_minimum_amount,
      is_donation_destination,
    } = body;

    if (!xendit_channel_code || !bank_account_holder_name || !bank_account_number) {
      return NextResponse.json(
        { error: 'xendit_channel_code, bank_account_holder_name, and bank_account_number are required' },
        { status: 400 }
      );
    }

    // Validate schedule value
    const validSchedules: DisbursementSchedule[] = ['manual', 'daily', 'weekly', 'monthly'];
    if (disbursement_schedule && !validSchedules.includes(disbursement_schedule)) {
      return NextResponse.json(
        { error: `Invalid disbursement_schedule. Must be one of: ${validSchedules.join(', ')}` },
        { status: 400 }
      );
    }

    const config: UpdatePayoutConfigDto = {
      xendit_channel_code,
      bank_account_holder_name,
      bank_account_number,
      disbursement_schedule: disbursement_schedule || 'manual',
      disbursement_minimum_amount: disbursement_minimum_amount || 1000, // Default PHP 1000
      is_donation_destination: is_donation_destination ?? false,
    };

    const financialSourceService = container.get<FinancialSourceService>(TYPES.FinancialSourceService);

    const updatedSource = await financialSourceService.updatePayoutConfiguration(
      sourceId,
      tenantId,
      config
    );

    // Return the updated config (with masked account number)
    const updatedConfig = await financialSourceService.getPayoutConfiguration(sourceId, tenantId);

    return NextResponse.json({
      success: true,
      config: updatedConfig,
    });
  } catch (error) {
    console.error('[PUT /api/finance/sources/[sourceId]/payout-config]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update payout configuration' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/finance/sources/[sourceId]/payout-config
 * Clear payout configuration
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { sourceId } = await params;
    await getCurrentUserId(); // Ensure authenticated
    const tenantId = await getCurrentTenantId();

    const financialSourceService = container.get<FinancialSourceService>(TYPES.FinancialSourceService);

    await financialSourceService.clearPayoutConfiguration(sourceId);

    return NextResponse.json({
      success: true,
      message: 'Payout configuration cleared',
    });
  } catch (error) {
    console.error('[DELETE /api/finance/sources/[sourceId]/payout-config]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to clear payout configuration' },
      { status: 500 }
    );
  }
}
