import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { DonationService } from '@/services/DonationService';
import { DonationFeeService } from '@/services/DonationFeeService';
import { getCurrentTenantId } from '@/lib/server/context';
import type { PaymentMethodType } from '@/models/donation.model';

/**
 * GET /api/donations/fees
 *
 * Calculate fees for a donation amount.
 *
 * Query Parameters:
 * - amount: number (required) - Donation amount in PHP
 * - payment_method_type: 'card' | 'ewallet' | 'bank_transfer' | 'direct_debit' (required)
 * - currency: string (optional, default: 'PHP')
 *
 * Response:
 * - donation_amount: Original donation amount (what church receives)
 * - xendit_fee: Xendit transaction fee
 * - platform_fee: StewardTrack platform fee
 * - total_fees: Combined fees (xendit + platform)
 * - total_charged: Total charged to donor (donation + fees)
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = await getCurrentTenantId();
    const donationService = container.get<DonationService>(TYPES.DonationService);

    const { searchParams } = new URL(request.url);
    const amountStr = searchParams.get('amount');
    const paymentMethodType = searchParams.get('payment_method_type') as PaymentMethodType;
    const currency = searchParams.get('currency') || 'PHP';

    // Validate amount
    if (!amountStr) {
      return NextResponse.json(
        { success: false, error: 'Amount is required' },
        { status: 400 }
      );
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Validate payment method type
    const validTypes: PaymentMethodType[] = ['card', 'ewallet', 'bank_transfer', 'direct_debit'];
    if (!paymentMethodType || !validTypes.includes(paymentMethodType)) {
      return NextResponse.json(
        { success: false, error: 'Valid payment_method_type is required (card, ewallet, bank_transfer, direct_debit)' },
        { status: 400 }
      );
    }

    // Calculate fees
    const feeCalculation = await donationService.calculateFees(
      amount,
      paymentMethodType,
      tenantId,
      currency
    );

    return NextResponse.json({
      success: true,
      data: feeCalculation,
    });
  } catch (error: any) {
    console.error('[Donations API] Error calculating fees:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to calculate fees',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/donations/fees/display
 *
 * Get fee information for all payment methods (for UI display).
 *
 * Query Parameters:
 * - amount: number (optional, default: 1000) - Example amount for calculations
 *
 * Response:
 * - Array of fee display info per payment method
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = await getCurrentTenantId();
    const feeService = container.get<DonationFeeService>(TYPES.DonationFeeService);

    const body = await request.json();
    const exampleAmount = body.amount || 1000;

    const feeDisplay = await feeService.getFeeDisplayInfo(tenantId, exampleAmount);

    return NextResponse.json({
      success: true,
      data: feeDisplay,
    });
  } catch (error: any) {
    console.error('[Donations API] Error fetching fee display info:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch fee display info',
      },
      { status: 500 }
    );
  }
}
