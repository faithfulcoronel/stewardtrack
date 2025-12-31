import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';

export async function GET(request: NextRequest) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || undefined;

    const statistics = await rbacService.getDashboardStatistics(tenantId);

    return NextResponse.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Error fetching RBAC statistics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch RBAC statistics'
      },
      { status: 500 }
    );
  }
}