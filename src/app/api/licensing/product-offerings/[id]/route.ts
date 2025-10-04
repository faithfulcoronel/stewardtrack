import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { LicensingService } from '@/services/LicensingService';
import type { UpdateProductOfferingDto } from '@/models/productOffering.model';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/licensing/product-offerings/[id]
 * Retrieves a specific product offering by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Await params in Next.js 15
    const { id } = await params;

    const licensingService = container.get<LicensingService>(TYPES.LicensingService);

    const { searchParams } = new URL(request.url);
    const withFeatures = searchParams.get('withFeatures') === 'true';

    const offering = withFeatures
      ? await licensingService.getProductOfferingWithFeatures(id)
      : await licensingService.getProductOffering(id);

    if (!offering) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product offering not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: offering,
    });
  } catch (error) {
    console.error('Error fetching product offering:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch product offering',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/licensing/product-offerings/[id]
 * Updates a product offering
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // Await params in Next.js 15
    const { id } = await params;

    const body: UpdateProductOfferingDto = await request.json();
    const licensingService = container.get<LicensingService>(TYPES.LicensingService);

    const offering = await licensingService.updateProductOffering(id, body);

    return NextResponse.json({
      success: true,
      data: offering,
    });
  } catch (error) {
    console.error('Error updating product offering:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update product offering',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/licensing/product-offerings/[id]
 * Deletes a product offering
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Await params in Next.js 15
    const { id } = await params;

    const licensingService = container.get<LicensingService>(TYPES.LicensingService);

    await licensingService.deleteProductOffering(id);

    return NextResponse.json({
      success: true,
      message: 'Product offering deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting product offering:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete product offering',
      },
      { status: 500 }
    );
  }
}
