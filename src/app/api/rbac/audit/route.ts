import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';

export async function GET(request: NextRequest) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const auditLogs = await rbacService.getAuditLogs(tenantId, limit, offset);

    return NextResponse.json({
      success: true,
      data: auditLogs
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch audit logs'
      },
      { status: 500 }
    );
  }
}