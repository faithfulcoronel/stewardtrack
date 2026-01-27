import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';
import type { MemberImportService } from '@/services/MemberImportService';
import { PermissionGate } from '@/lib/access-gate';

/**
 * GET /api/members/import
 * Downloads Excel template for member import with instructions and lookup data
 * @requires members:manage permission
 */
export async function GET(_request: NextRequest) {
  try {
    const tenantId = await getCurrentTenantId();

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'No tenant context available' },
        { status: 401 }
      );
    }

    // Check permission using PermissionGate (single source of truth)
    const userId = await getCurrentUserId();
    const permissionGate = new PermissionGate('members:manage', 'all');
    const accessResult = await permissionGate.check(userId, tenantId);

    if (!accessResult.allowed) {
      return NextResponse.json(
        { success: false, error: accessResult.reason || 'Permission denied' },
        { status: 403 }
      );
    }

    // Get service from DI container
    const memberImportService = container.get<MemberImportService>(TYPES.MemberImportService);

    // Get template data via service
    const templateData = await memberImportService.getTemplateData(tenantId);

    // Generate workbook via service
    const wb = memberImportService.generateTemplateWorkbook(templateData);

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Return as download
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="members-import-template-${new Date().toISOString().split('T')[0]}.xlsx"`,
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
 * POST /api/members/import
 * Imports members from Excel file
 * @requires members:manage permission
 *
 * FormData parameters:
 * - file: The Excel file to import
 * - preview: 'true' to only validate and return preview (no actual import)
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = await getCurrentTenantId();
    const userId = await getCurrentUserId();

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'No tenant context available' },
        { status: 401 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check permission using PermissionGate (single source of truth)
    const permissionGate = new PermissionGate('members:manage', 'all');
    const accessResult = await permissionGate.check(userId, tenantId);

    if (!accessResult.allowed) {
      return NextResponse.json(
        { success: false, error: accessResult.reason || 'Permission denied' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const preview = formData.get('preview') === 'true';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream'
    ];

    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Please upload an Excel file (.xlsx or .xls)' },
        { status: 400 }
      );
    }

    // Get service from DI container
    const memberImportService = container.get<MemberImportService>(TYPES.MemberImportService);

    // Parse and validate Excel file via service
    const parsedData = await memberImportService.parseExcelFile(file, tenantId);

    // If preview mode or validation errors, return preview data
    if (preview || parsedData.errors.length > 0) {
      const previewResult = memberImportService.getPreviewResult(parsedData);
      return NextResponse.json(previewResult);
    }

    // Execute import via service
    const importResult = await memberImportService.executeImport(parsedData.data, tenantId, userId);

    // Handle RPC errors
    if (!importResult.success || (importResult.errors && importResult.errors.length > 0)) {
      return NextResponse.json({
        success: false,
        data: importResult,
        errors: importResult.errors,
        message: `Import completed with errors: ${importResult.imported_count} imported, ${importResult.error_count} failed`,
      });
    }

    return NextResponse.json({
      success: true,
      data: importResult,
      message: `Successfully imported ${importResult.imported_count} member${importResult.imported_count !== 1 ? 's' : ''}`,
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
