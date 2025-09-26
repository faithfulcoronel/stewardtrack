import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.nextUrl.searchParams.get('tenantId') ?? undefined;
    const body = await request.json().catch(() => ({}));

    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const result = await rbacService.queueMetadataCompilationJob(tenantId);

    return NextResponse.json({
      success: true,
      data: {
        job: result.job,
        summary: result.summary,
        scope: body?.scope ?? 'all'
      }
    });
  } catch (error) {
    console.error('Error queuing metadata compilation job:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to queue metadata compilation job'
      },
      { status: 500 }
    );
  }
}

