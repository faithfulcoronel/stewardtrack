import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';

export async function GET(request: NextRequest) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || undefined;

    const viewStatus = await rbacService.getMaterializedViewStatus(tenantId);

    return NextResponse.json({
      success: true,
      data: viewStatus
    });
  } catch (error) {
    console.error('Error fetching materialized view status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch materialized view status'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || undefined;
    const { action } = await request.json();

    if (action === 'refresh') {
      const result = await rbacService.refreshMaterializedViews(tenantId);

      return NextResponse.json({
        success: true,
        data: { message: 'Materialized views refresh initiated', ...result }
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid action specified'
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error managing materialized views:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to manage materialized views'
      },
      { status: 500 }
    );
  }
}