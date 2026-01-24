import { NextRequest, NextResponse } from 'next/server';
import { decodeRegistrationToken, isRegistrationTokenValid } from '@/lib/tokens/registrationToken';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { ScheduleRegistrationPaymentService } from '@/services/ScheduleRegistrationPaymentService';
import type { PaymentMethodType } from '@/models/donation.model';

type RouteParams = { params: Promise<{ token: string }> };

/**
 * POST /api/register/[token]/fees
 * Calculate fee breakdown for a registration payment
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;

    // Validate token
    if (!isRegistrationTokenValid(token)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired registration link' },
        { status: 400 }
      );
    }

    const tokenData = decodeRegistrationToken(token);
    if (!tokenData) {
      return NextResponse.json(
        { success: false, error: 'Invalid registration link' },
        { status: 400 }
      );
    }

    const { tenantId, scheduleId } = tokenData;

    // Parse request body
    const body = await request.json();
    const { payment_method_type } = body;

    if (!payment_method_type) {
      return NextResponse.json(
        { success: false, error: 'Payment method type is required' },
        { status: 400 }
      );
    }

    // Validate payment method type
    const validMethods: PaymentMethodType[] = ['ewallet', 'card', 'bank_transfer', 'direct_debit'];
    if (!validMethods.includes(payment_method_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment method type' },
        { status: 400 }
      );
    }

    // Calculate fees
    const paymentService = container.get<ScheduleRegistrationPaymentService>(
      TYPES.ScheduleRegistrationPaymentService
    );

    const feeCalculation = await paymentService.calculateFees(
      scheduleId,
      tenantId,
      payment_method_type as PaymentMethodType
    );

    return NextResponse.json({
      success: true,
      data: {
        registration_fee: feeCalculation.registration_fee,
        xendit_fee: feeCalculation.xendit_fee,
        platform_fee: feeCalculation.platform_fee,
        total_fees: feeCalculation.total_fees,
        total_charged: feeCalculation.total_charged,
        currency: feeCalculation.currency,
        is_early_bird: feeCalculation.is_early_bird,
      },
    });
  } catch (error) {
    console.error('Error calculating registration fees:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to calculate fees' },
      { status: 500 }
    );
  }
}
