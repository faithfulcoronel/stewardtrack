import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { DiscountService } from '@/services/DiscountService';
import type { IAuthRepository } from '@/repositories/auth.repository';
import type { CreateDiscountDto } from '@/models/discount.model';

/**
 * GET /api/licensing/discounts
 * Retrieves all discounts.
 *
 * Query params:
 * - includeInactive: Include inactive discounts (admin only)
 * - type: Filter by discount type ('coupon' | 'automatic')
 * - withStats: Include redemption statistics (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const type = searchParams.get('type');
    const withStats = searchParams.get('withStats') === 'true';

    const discountService = container.get<DiscountService>(TYPES.DiscountService);

    let discounts;

    if (withStats) {
      discounts = await discountService.getDiscountsWithStats();
    } else if (type === 'coupon') {
      discounts = await discountService.getCouponDiscounts();
    } else if (type === 'automatic') {
      discounts = await discountService.getAutomaticDiscounts();
    } else {
      discounts = await discountService.getAllDiscounts(includeInactive);
    }

    return NextResponse.json({
      success: true,
      data: discounts,
    });
  } catch (error) {
    console.error('Error fetching discounts:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch discounts',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/licensing/discounts
 * Creates a new discount.
 *
 * Requires super admin or admin role.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authRepository = container.get<IAuthRepository>(TYPES.IAuthRepository);
    const { data: userData } = await authRepository.getUser();

    if (!userData?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body: CreateDiscountDto = await request.json();
    const discountService = container.get<DiscountService>(TYPES.DiscountService);

    const discount = await discountService.createDiscount(body);

    return NextResponse.json(
      {
        success: true,
        data: discount,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating discount:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create discount',
      },
      { status: 500 }
    );
  }
}
