import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { DiscountService } from '@/services/DiscountService';
import { DEFAULT_CURRENCY } from '@/lib/currency';

/**
 * POST /api/licensing/discounts/apply
 * Gets the best available automatic discount for an offering and applies it.
 *
 * Body:
 * - offeringId: The product offering ID
 * - amount: The original price
 * - currency: The currency code (defaults to PHP)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { offeringId, amount, currency = DEFAULT_CURRENCY } = body;

    if (!offeringId || amount === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: offeringId, amount',
        },
        { status: 400 }
      );
    }

    const discountService = container.get<DiscountService>(TYPES.DiscountService);

    const result = await discountService.applyBestDiscount(offeringId, parseFloat(amount), currency);

    return NextResponse.json({
      success: result.success,
      data: {
        discount: result.discount || null,
        originalPrice: result.originalPrice,
        discountAmount: result.discountAmount,
        discountedPrice: result.discountedPrice,
      },
      message: result.errorMessage,
    });
  } catch (error) {
    console.error('Error applying discount:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to apply discount',
      },
      { status: 500 }
    );
  }
}
