import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { DonationFeeService } from '@/services/DonationFeeService';
import { getCurrentTenantId } from '@/lib/server/context';

/**
 * GET /api/donations/fee-config
 *
 * Get the current fee configuration for the tenant.
 *
 * Response includes:
 * - Platform fee settings (percentage, fixed, min/max)
 * - Xendit fee rates for each payment method
 * - Display settings (show breakdown, allow donor fee coverage)
 */
export async function GET(_request: NextRequest) {
  try {
    const tenantId = await getCurrentTenantId();
    const feeService = container.get<DonationFeeService>(TYPES.DonationFeeService);

    const config = await feeService.getFeeConfig(tenantId);

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    console.error('[Donations API] Error fetching fee config:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch fee configuration',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/donations/fee-config
 *
 * Update the fee configuration for the tenant.
 *
 * Request Body:
 * - platform_fee_type: 'percentage' | 'fixed' | 'hybrid'
 * - platform_fee_percentage: number (0-10)
 * - platform_fee_fixed: number (non-negative)
 * - platform_fee_min: number | null
 * - platform_fee_max: number | null
 * - show_fee_breakdown: boolean
 * - allow_donor_fee_coverage: boolean
 */
export async function PUT(request: NextRequest) {
  try {
    const tenantId = await getCurrentTenantId();
    const feeService = container.get<DonationFeeService>(TYPES.DonationFeeService);

    const body = await request.json();

    // Validate platform fee percentage
    if (body.platform_fee_percentage !== undefined) {
      if (body.platform_fee_percentage < 0 || body.platform_fee_percentage > 10) {
        return NextResponse.json(
          { success: false, error: 'Platform fee percentage must be between 0 and 10' },
          { status: 400 }
        );
      }
    }

    // Validate platform fee fixed
    if (body.platform_fee_fixed !== undefined && body.platform_fee_fixed < 0) {
      return NextResponse.json(
        { success: false, error: 'Platform fixed fee cannot be negative' },
        { status: 400 }
      );
    }

    const config = await feeService.updateFeeConfig(tenantId, body);

    return NextResponse.json({
      success: true,
      data: config,
      message: 'Fee configuration updated successfully',
    });
  } catch (error: any) {
    console.error('[Donations API] Error updating fee config:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update fee configuration',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/donations/fee-config/reset
 *
 * Reset fee configuration to defaults.
 */
export async function POST(_request: NextRequest) {
  try {
    const tenantId = await getCurrentTenantId();
    const feeService = container.get<DonationFeeService>(TYPES.DonationFeeService);

    const config = await feeService.resetFeeConfigToDefaults(tenantId);

    return NextResponse.json({
      success: true,
      data: config,
      message: 'Fee configuration reset to defaults',
    });
  } catch (error: any) {
    console.error('[Donations API] Error resetting fee config:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to reset fee configuration',
      },
      { status: 500 }
    );
  }
}
