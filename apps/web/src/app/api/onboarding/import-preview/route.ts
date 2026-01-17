/**
 * POST /api/onboarding/import-preview
 *
 * Parses an uploaded Excel file and returns a preview of the data
 * along with validation results.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authUtils } from '@/utils/authUtils';
import { tenantUtils } from '@/utils/tenantUtils';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { ExcelImportService } from '@/services/ExcelImportService';

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

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an Excel file (.xlsx or .xls)' },
        { status: 400 }
      );
    }

    // Read file buffer
    const buffer = await file.arrayBuffer();

    // Parse and validate
    const excelImportService = container.get<ExcelImportService>(TYPES.ExcelImportService);
    const result = await excelImportService.parseAndValidate(buffer);

    return NextResponse.json({
      success: true,
      parseResult: {
        success: result.parseResult.success,
        errors: result.parseResult.errors,
        warnings: result.parseResult.warnings,
      },
      validationResult: result.validationResult,
      summary: result.summary,
      data: result.parseResult.data ? {
        members: result.parseResult.data.members.slice(0, 10), // Preview first 10
        membershipStatuses: result.parseResult.data.membershipStatuses,
        financialSources: result.parseResult.data.financialSources,
        funds: result.parseResult.data.funds,
        incomeCategories: result.parseResult.data.incomeCategories,
        expenseCategories: result.parseResult.data.expenseCategories,
        budgetCategories: result.parseResult.data.budgetCategories,
        openingBalances: result.parseResult.data.openingBalances,
      } : null,
    });
  } catch (error) {
    console.error('Error parsing import file:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse file' },
      { status: 500 }
    );
  }
}
