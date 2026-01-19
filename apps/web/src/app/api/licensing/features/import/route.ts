import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { AuthorizationService } from '@/services/AuthorizationService';
import { getCurrentUserId } from '@/lib/server/context';
import type { FeatureImportService } from '@/services/FeatureImportService';

/**
 * GET /api/licensing/features/import
 * Downloads Excel template with all existing features, permissions, and role templates
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
    const featureImportService = container.get<FeatureImportService>(TYPES.FeatureImportService);

    // Get template data via service
    const templateData = await featureImportService.getTemplateData();

    // Generate workbook via service
    const wb = featureImportService.generateTemplateWorkbook(templateData);

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Return as download
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="features-import-template-${new Date().toISOString().split('T')[0]}.xlsx"`,
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

/**
 * POST /api/licensing/features/import
 * Imports features, permissions, and role templates from Excel file
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
    const preview = formData.get('preview') === 'true';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Get service from DI container
    const featureImportService = container.get<FeatureImportService>(TYPES.FeatureImportService);

    // Parse and validate Excel file via service
    const parsedData = await featureImportService.parseExcelFile(file);

    // If preview mode or validation errors, return preview data
    if (preview || parsedData.errors.length > 0) {
      const previewResult = featureImportService.getPreviewResult(parsedData);
      return NextResponse.json(previewResult);
    }

    // Execute import via service
    const importResult = await featureImportService.executeImport(parsedData.data, userId);

    // Handle RPC errors
    if (importResult.errors && importResult.errors.length > 0) {
      return NextResponse.json({
        success: false,
        data: importResult,
        errors: importResult.errors,
      });
    }

    return NextResponse.json({
      success: true,
      data: importResult,
      message: `Import completed: ${importResult.features_added} features added, ${importResult.features_updated} updated, ${importResult.features_deleted} deleted; ` +
        `${importResult.permissions_added} permissions added, ${importResult.permissions_updated} updated, ${importResult.permissions_deleted} deleted; ` +
        `${importResult.role_templates_added} role templates added, ${importResult.role_templates_updated} updated, ${importResult.role_templates_deleted} deleted`,
    });
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
