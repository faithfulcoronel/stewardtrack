import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { DiscountService } from '@/services/DiscountService';
import { DEFAULT_CURRENCY } from '@/lib/currency';

interface RouteParams {
  params: Promise<{ offeringId: string }>;
}

/**
 * GET /api/licensing/discounts/offerings/[offeringId]
 * Gets active automatic discounts for a specific offering.
 *
 * Query params:
 * - currency: The currency code (defaults to PHP)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { offeringId } = await params;
    const { searchParams } = new URL(request.url);
    const currency = searchParams.get('currency') || DEFAULT_CURRENCY;

    const discountService = container.get<DiscountService>(TYPES.DiscountService);

    const discounts = await discountService.getActiveDiscountsForOffering(offeringId, currency);

    return NextResponse.json({
      success: true,
      data: discounts,
    });
  } catch (error) {
    console.error('Error fetching discounts for offering:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch discounts for offering',
      },
      { status: 500 }
    );
  }
}
