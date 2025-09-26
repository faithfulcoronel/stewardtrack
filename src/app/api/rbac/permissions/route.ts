import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';

export async function GET(request: NextRequest) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const { searchParams } = new URL(request.url);
    const module = searchParams.get('module') || undefined;
    const tenantId = searchParams.get('tenantId') || undefined;
    const groupByModule = searchParams.get('groupByModule') === 'true';

    if (groupByModule) {
      const permissionsByModule = await rbacService.getPermissionsByModule(tenantId);
      return NextResponse.json({
        success: true,
        data: permissionsByModule
      });
    }

    const permissions = await rbacService.getPermissions(tenantId, module);

    return NextResponse.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch permissions'
      },
      { status: 500 }
    );
  }
}