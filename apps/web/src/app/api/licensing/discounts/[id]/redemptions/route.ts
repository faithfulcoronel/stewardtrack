import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { DiscountService } from '@/services/DiscountService';
import type { IAuthRepository } from '@/repositories/auth.repository';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/licensing/discounts/[id]/redemptions
 * Gets redemption history for a specific discount.
 *
 * Requires authentication.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;
    const discountService = container.get<DiscountService>(TYPES.DiscountService);

    const redemptions = await discountService.getDiscountRedemptions(id);

    return NextResponse.json({
      success: true,
      data: redemptions,
    });
  } catch (error) {
    console.error('Error fetching discount redemptions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch discount redemptions',
      },
      { status: 500 }
    );
  }
}
