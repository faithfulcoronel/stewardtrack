import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { DiscountService } from '@/services/DiscountService';
import type { IAuthRepository } from '@/repositories/auth.repository';
import type { UpdateDiscountDto } from '@/models/discount.model';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/licensing/discounts/[id]
 * Retrieves a single discount by ID.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const discountService = container.get<DiscountService>(TYPES.DiscountService);

    const discount = await discountService.getDiscountById(id);

    if (!discount) {
      return NextResponse.json(
        { success: false, error: 'Discount not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: discount,
    });
  } catch (error) {
    console.error('Error fetching discount:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch discount',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/licensing/discounts/[id]
 * Updates a discount.
 *
 * Requires super admin or admin role.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
    const body: UpdateDiscountDto = await request.json();
    const discountService = container.get<DiscountService>(TYPES.DiscountService);

    const discount = await discountService.updateDiscount(id, body);

    return NextResponse.json({
      success: true,
      data: discount,
    });
  } catch (error) {
    console.error('Error updating discount:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update discount',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/licensing/discounts/[id]
 * Soft deletes a discount.
 *
 * Requires super admin or admin role.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    await discountService.deleteDiscount(id);

    return NextResponse.json({
      success: true,
      message: 'Discount deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting discount:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete discount',
      },
      { status: 500 }
    );
  }
}
