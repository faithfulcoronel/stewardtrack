import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { DiscountService } from '@/services/DiscountService';

/**
 * POST /api/licensing/discounts/validate
 * Validates a discount code for a specific offering.
 *
 * Body:
 * - code: The discount code to validate
 * - offeringId: The product offering ID
 * - tenantId: The tenant ID (for redemption tracking)
 * - amount: The original price
 * - currency: The currency code
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, offeringId, tenantId, amount, currency } = body;

    if (!code || !offeringId || !tenantId || amount === undefined || !currency) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: code, offeringId, tenantId, amount, currency',
        },
        { status: 400 }
      );
    }

    const discountService = container.get<DiscountService>(TYPES.DiscountService);

    const result = await discountService.applyCouponCode(
      code,
      offeringId,
      tenantId,
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
