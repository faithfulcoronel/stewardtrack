/**
 * POST /api/onboarding/import-confirm
 *
 * Executes the import after user confirmation.
 * Expects the same file to be uploaded again for processing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authUtils } from '@/utils/authUtils';
import { tenantUtils } from '@/utils/tenantUtils';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { ExcelImportService } from '@/services/ExcelImportService';
import { parseImportFile, validateImportData } from '@/lib/excel';

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const user = await authUtils.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 });
    }

    // Get the uploaded file
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Read file buffer
    const buffer = await file.arrayBuffer();

    // Parse file
    const parseResult = parseImportFile(buffer);

    if (!parseResult.success || !parseResult.data) {
      return NextResponse.json(
        {
          error: 'Failed to parse file',
          details: parseResult.errors,
        },
        { status: 400 }
      );
    }

    // Validate data
    const validationResult = validateImportData(parseResult.data);

    if (!validationResult.isValid) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.errors,
        },
        { status: 400 }
      );
    }

    // Execute import
    const excelImportService = container.get<ExcelImportService>(TYPES.ExcelImportService);
    const importResult = await excelImportService.executeImport(parseResult.data, tenantId);

    return NextResponse.json({
      success: importResult.success,
      summary: importResult.summary,
      errors: importResult.errors,
      warnings: [
        ...parseResult.warnings,
        ...validationResult.warnings,
        ...importResult.warnings,
      ],
    });
  } catch (error) {
    console.error('Error executing import:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to execute import' },
      { status: 500 }
    );
  }
}
