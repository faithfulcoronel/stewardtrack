import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.nextUrl.searchParams.get('tenantId') ?? undefined;
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const jobs = await rbacService.getPublishingJobs(tenantId);

    return NextResponse.json({
      success: true,
      data: jobs
    });
  } catch (error) {
    console.error('Error fetching publishing jobs:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch publishing jobs'
      },
      { status: 500 }
    );
  }
}
