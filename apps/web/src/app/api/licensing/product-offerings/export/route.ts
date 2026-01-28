import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { AuthorizationService } from '@/services/AuthorizationService';
import type { ProductOfferingImportExportService } from '@/services/ProductOfferingImportExportService';
import type { ProductOfferingExportOptions } from '@/models/productOfferingImport.model';

/**
 * GET /api/licensing/product-offerings/export
 * Downloads all product offerings as Excel file
 *
 * Query params:
 * - includeInactive: boolean (default: false)
 * - tier: string (filter by tier)
 * - offeringType: string (filter by type)
 */
export async function GET(request: NextRequest) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.requireSuperAdmin();

    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const options: ProductOfferingExportOptions = {
      includeInactive: searchParams.get('includeInactive') === 'true',
      tier: searchParams.get('tier') || undefined,
      offeringType: searchParams.get('offeringType') || undefined,
    };

    // Get service from DI container
    const service = container.get<ProductOfferingImportExportService>(
      TYPES.ProductOfferingImportExportService
    );

    // Generate export workbook via service
    const wb = await service.generateExportWorkbook(options);

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Return as download
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="product-offerings-export-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Error exporting product offerings:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export product offerings',
      },
      { status: 500 }
    );
  }
}
