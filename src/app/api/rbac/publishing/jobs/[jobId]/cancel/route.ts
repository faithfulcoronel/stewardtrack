import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';

type RouteContext = {
  params: {
    jobId: string;
  };
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const tenantId = request.nextUrl.searchParams.get('tenantId') ?? undefined;
    const { jobId } = context.params;
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const job = await rbacService.cancelPublishingJob(jobId, tenantId);

    return NextResponse.json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error('Error cancelling publishing job:', error);
    const status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel publishing job'
      },
      { status }
    );
  }
}

