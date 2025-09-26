import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.nextUrl.searchParams.get('tenantId') ?? undefined;
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const job = await rbacService.queuePermissionSyncJob(tenantId);

    return NextResponse.json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error('Error queuing permission sync job:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to queue permission sync job'
      },
      { status: 500 }
    );
  }
}

