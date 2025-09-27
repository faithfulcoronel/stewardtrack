import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const { id: bundleId } = await params;

    // Get permissions in this bundle
    const permissions = await rbacService.getBundlePermissions(bundleId);

    return NextResponse.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('Error fetching permissions for bundle:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch permissions for bundle'
      },
      { status: 500 }
    );
  }
}