import 'server-only';
import 'reflect-metadata';
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { DonationService } from '@/services/DonationService';
import { decodeTenantToken } from '@/lib/tokens/shortUrlTokens';
import type { PaymentMethodType } from '@/models/donation.model';

// Force Node.js runtime for this route
export const runtime = 'nodejs';

/**
 * GET /api/public/donations/fees
 *
 * Public endpoint to calculate donation fees.
 *
 * Query Parameters:
 * - tenantToken: string (required) - Encoded tenant token
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
    const { searchParams } = new URL(request.url);
    const tenantToken = searchParams.get('tenantToken');
    const amountStr = searchParams.get('amount');
    const paymentMethodType = searchParams.get('payment_method_type') as PaymentMethodType;
    const currency = searchParams.get('currency') || 'PHP';

    // Validate tenant token
    if (!tenantToken) {
      return NextResponse.json(
        { success: false, error: 'Tenant token is required' },
        { status: 400 }
      );
    }

    const tenantId = decodeTenantToken(tenantToken);
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Invalid tenant token' },
        { status: 400 }
      );
    }

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

    const donationService = container.get<DonationService>(TYPES.DonationService);

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
  } catch (error: unknown) {
    console.error('[Public Donations API] Error calculating fees:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate fees',
      },
      { status: 500 }
    );
  }
}
