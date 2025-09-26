import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';

export async function GET(request: NextRequest) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '1000');

    const auditLogs = await rbacService.getAuditLogs(undefined, limit);

    // Generate CSV content
    const headers = [
      'Timestamp',
      'Action',
      'Resource Type',
      'Resource ID',
      'User ID',
      'Security Impact',
      'IP Address',
      'Notes'
    ];

    const csvRows = [
      headers.join(','),
      ...auditLogs.map(log => [
        `"${new Date(log.created_at).toISOString()}"`,
        `"${log.action || ''}"`,
        `"${log.resource_type || ''}"`,
        `"${log.resource_id || ''}"`,
        `"${log.user_id || 'System'}"`,
        `"${log.security_impact || 'unknown'}"`,
        `"${log.ip_address || ''}"`,
        `"${(log.notes || '').replace(/"/g, '""')}"` // Escape quotes in notes
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="rbac-audit-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export audit logs'
      },
      { status: 500 }
    );
  }
}