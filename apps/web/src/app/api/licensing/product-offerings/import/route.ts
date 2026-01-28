import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { AuthorizationService } from '@/services/AuthorizationService';
import { getCurrentUserId } from '@/lib/server/context';
import type { ProductOfferingImportExportService } from '@/services/ProductOfferingImportExportService';

/**
 * POST /api/licensing/product-offerings/import
 * Import product offerings from Excel file
 *
 * FormData:
 * - file: Excel file
 * - mode: 'preview' | 'execute'
 */
export async function POST(request: NextRequest) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.requireSuperAdmin();

    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode }
      );
    }

    const userId = await getCurrentUserId();
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const mode = formData.get('mode') as string || 'preview';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Get service from DI container
    const service = container.get<ProductOfferingImportExportService>(
      TYPES.ProductOfferingImportExportService
    );

    // Parse Excel file via service
    const parsedData = await service.parseExcelFile(file);

    // Validate rows
    const validationResult = await service.validateRows(parsedData.rows);

    // If validation has errors, return them
    if (!validationResult.isValid) {
      return NextResponse.json({
        success: false,
        mode: 'validation',
        validation: validationResult,
        message: `Validation failed with ${validationResult.errorCount} error(s)`,
      });
    }

    // If preview mode, return preview data
    if (mode === 'preview') {
      const previewResult = await service.previewChanges(validationResult.validRows);
      return NextResponse.json({
        success: true,
        mode: 'preview',
        preview: previewResult,
        validation: {
          totalRows: validationResult.totalRows,
          errorCount: validationResult.errorCount,
          warningCount: validationResult.warningCount,
          errors: validationResult.errors.filter(e => e.severity === 'warning'),
        },
      });
    }

    // Execute import
    if (mode === 'execute') {
      const executeResult = await service.executeBulkUpsert(validationResult.validRows, userId);

      // Handle execution errors
      if (!executeResult.success) {
        return NextResponse.json({
          success: false,
          mode: 'execute',
          result: executeResult,
          message: `Import failed with ${executeResult.errors.length} error(s)`,
        });
      }

      return NextResponse.json({
        success: true,
        mode: 'execute',
        result: executeResult,
        message: `Import completed: ${executeResult.created} created, ${executeResult.updated} updated`,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid mode. Use "preview" or "execute"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error processing import:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process import',
      },
      { status: 500 }
    );
  }
}
