import 'server-only';
import 'reflect-metadata';
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { IncomeCategoryService } from '@/services/IncomeCategoryService';
import { decodeTenantToken } from '@/lib/tokens/shortUrlTokens';

// Force Node.js runtime for this route
export const runtime = 'nodejs';

/**
 * GET /api/public/donations/categories
 *
 * Public endpoint to get available donation categories for a tenant.
 *
 * Query Parameters:
 * - tenantToken: string (required) - Encoded tenant token
 *
 * Response:
 * - Array of categories with id, name, description
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantToken = searchParams.get('tenantToken');

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

    const categoryService = container.get<IncomeCategoryService>(
      TYPES.IncomeCategoryService
    );

    // Get active income categories (donation types) for the tenant
    const categories = await categoryService.getActive('income_transaction', tenantId);

    // Map to simplified response format
    const donationCategories = categories.map((cat: { id: string; name: string; code?: string; description?: string }) => ({
      id: cat.id,
      name: cat.name,
      code: cat.code,
      description: cat.description || null,
    }));

    return NextResponse.json({
      success: true,
      data: donationCategories,
    });
  } catch (error: unknown) {
    console.error('[Public Donations API] Error fetching categories:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch donation categories',
      },
      { status: 500 }
    );
  }
}
