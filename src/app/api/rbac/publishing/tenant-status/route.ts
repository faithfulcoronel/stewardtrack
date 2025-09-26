import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.nextUrl.searchParams.get('tenantId') ?? undefined;
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const statuses = await rbacService.getTenantPublishingStatuses(tenantId);

    return NextResponse.json({
      success: true,
      data: statuses
    });
  } catch (error) {
    console.error('Error fetching tenant publishing status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch tenant publishing status'
      },
      { status: 500 }
    );
  }
}

