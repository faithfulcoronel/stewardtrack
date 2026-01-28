import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { AuthorizationService } from '@/services/AuthorizationService';
import type { ProductOfferingImportExportService } from '@/services/ProductOfferingImportExportService';

/**
 * GET /api/licensing/product-offerings/import/template
 * Downloads empty import template with instructions and reference data
 */
export async function GET(_request: NextRequest) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.requireSuperAdmin();

    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode }
      );
    }

    // Get service from DI container
    const service = container.get<ProductOfferingImportExportService>(
      TYPES.ProductOfferingImportExportService
    );

    // Get template data via service (includes reference data)
    const templateData = await service.getTemplateData();

    // Generate workbook via service
    const wb = service.generateTemplateWorkbook(templateData);

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Return as download
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="product-offerings-import-template-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Error generating template:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate template',
      },
      { status: 500 }
    );
  }
}
