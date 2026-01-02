import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { LicensingService } from '@/services/LicensingService';
import { AuthorizationService } from '@/services/AuthorizationService';
import { isSupportedCurrency } from '@/lib/currency';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/licensing/product-offerings/[id]/prices
 * Get all currency-specific prices for a product offering
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: offeringId } = await params;
    const licensingService = container.get<LicensingService>(TYPES.LicensingService);

    const prices = await licensingService.getOfferingPrices(offeringId);

    return NextResponse.json({
      success: true,
      data: prices,
    });
  } catch (error) {
    console.error('Error in GET /api/licensing/product-offerings/[id]/prices:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/licensing/product-offerings/[id]/prices
 * Update all currency-specific prices for a product offering
 * Replaces existing prices with the provided list
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // Check super admin permission
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.requireSuperAdmin();

    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode }
      );
    }

    const { id: offeringId } = await params;
    const body = await request.json();
    const { prices } = body as {
      prices: Array<{
        id?: string;
        currency: string;
        price: number;
        is_active: boolean;
      }>;
    };

    if (!Array.isArray(prices)) {
      return NextResponse.json(
        { success: false, error: 'Invalid prices format' },
        { status: 400 }
      );
    }

    // Validate currencies
    for (const price of prices) {
      if (!isSupportedCurrency(price.currency)) {
        return NextResponse.json(
          { success: false, error: `Unsupported currency: ${price.currency}` },
          { status: 400 }
        );
      }
      if (typeof price.price !== 'number' || price.price < 0) {
        return NextResponse.json(
          { success: false, error: `Invalid price for ${price.currency}` },
          { status: 400 }
        );
      }
    }

    const licensingService = container.get<LicensingService>(TYPES.LicensingService);

    // Replace all prices with the new list
    const updatedPrices = await licensingService.replaceOfferingPrices(
      offeringId,
      prices.map((p) => ({
        currency: p.currency,
        price: p.price,
        is_active: p.is_active,
      }))
    );

    return NextResponse.json({
      success: true,
      data: updatedPrices,
    });
  } catch (error) {
    console.error('Error in PUT /api/licensing/product-offerings/[id]/prices:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/licensing/product-offerings/[id]/prices
 * Add a single currency price
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Check super admin permission
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.requireSuperAdmin();

    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode }
      );
    }

    const { id: offeringId } = await params;
    const body = await request.json();
    const { currency, price, is_active = true } = body as {
      currency: string;
      price: number;
      is_active?: boolean;
    };

    if (!currency || !isSupportedCurrency(currency)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or unsupported currency' },
        { status: 400 }
      );
    }

    if (typeof price !== 'number' || price < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid price' },
        { status: 400 }
      );
    }

    const licensingService = container.get<LicensingService>(TYPES.LicensingService);

    const data = await licensingService.upsertOfferingPrice(
      offeringId,
      currency,
      price,
      is_active
    );

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error in POST /api/licensing/product-offerings/[id]/prices:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
