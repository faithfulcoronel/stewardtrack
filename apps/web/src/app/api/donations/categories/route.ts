import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { IncomeCategoryService } from '@/services/IncomeCategoryService';
import { getCurrentTenantId } from '@/lib/server/context';

/**
 * GET /api/donations/categories
 *
 * Get available donation categories for the tenant.
 *
 * These are income categories configured by the church, such as:
 * - Tithes
 * - Offerings
 * - Missions
 * - Building Fund
 * - Special Offerings
 *
 * Response:
 * - Array of categories with id, name, description
 */
export async function GET(_request: NextRequest) {
  try {
    await getCurrentTenantId(); // Ensure tenant context
    const categoryService = container.get<IncomeCategoryService>(
      TYPES.IncomeCategoryService
    );

    // Get active income categories (donation types)
    const categories = await categoryService.getActive('income_transaction');

    // Map to simplified response format
    const donationCategories = categories.map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      code: cat.code,
      description: cat.description || null,
    }));

    return NextResponse.json({
      success: true,
      data: donationCategories,
    });
  } catch (error: any) {
    console.error('[Donations API] Error fetching categories:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch donation categories',
      },
      { status: 500 }
    );
  }
}
