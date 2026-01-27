import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';
import type { MemberImportService } from '@/services/MemberImportService';
import { PermissionGate } from '@/lib/access-gate';

/**
 * GET /api/members/export
 * Exports all members to Excel file in the same format as the import template.
 * This allows members to be migrated to another tenant.
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

    // Generate export workbook
    const wb = await memberImportService.generateExportWorkbook(tenantId);

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Return as download
    const timestamp = new Date().toISOString().split('T')[0];
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="members-export-${timestamp}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Error generating export:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate export',
      },
      { status: 500 }
    );
  }
}
