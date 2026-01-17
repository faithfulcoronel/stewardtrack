import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { DiscountService } from '@/services/DiscountService';

/**
 * POST /api/licensing/discounts/validate-public
 * Validates a discount code for pre-signup scenarios (no tenant ID required).
 *
 * This endpoint performs basic coupon validation without tenant-specific checks
 * like per-tenant usage limits. Those checks happen during actual redemption.
 *
 * Body:
 * - code: The discount code to validate
 * - offeringId: The product offering ID
 * - amount: The original price
 * - currency: The currency code
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, offeringId, amount, currency } = body;

    if (!code || !offeringId || amount === undefined || !currency) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: code, offeringId, amount, currency',
        },
        { status: 400 }
      );
    }

    const discountService = container.get<DiscountService>(TYPES.DiscountService);

    const result = await discountService.applyCouponCodePublic(
      code,
      offeringId,
      parseFloat(amount),
      currency
    );

    return NextResponse.json({
      success: result.success,
      data: result.success
        ? {
            discount: result.discount,
            originalPrice: result.originalPrice,
            discountAmount: result.discountAmount,
            discountedPrice: result.discountedPrice,
            durationBillingCycles: result.durationBillingCycles,
          }
        : null,
      error: result.errorMessage,
    });
  } catch (error) {
    console.error('Error validating discount code:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate discount code',
      },
      { status: 500 }
    );
  }
}
