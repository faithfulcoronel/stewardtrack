import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.nextUrl.searchParams.get('tenantId') ?? undefined;
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const job = await rbacService.queueLicenseValidationJob(tenantId);

    return NextResponse.json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error('Error queuing license validation job:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to queue license validation job'
      },
      { status: 500 }
    );
  }
}

