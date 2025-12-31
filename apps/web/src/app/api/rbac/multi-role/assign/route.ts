import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';
import { getCurrentTenantId } from '@/lib/server/context';

export async function POST(request: NextRequest) {
  try {
    const tenantId = await getCurrentTenantId();
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const body = await request.json();

    const { user_id, role_ids, override_conflicts = false } = body;

    if (!user_id || !role_ids || !Array.isArray(role_ids) || role_ids.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'user_id and role_ids array are required'
        },
        { status: 400 }
      );
    }

    const result = await rbacService.assignMultipleRoles(user_id, role_ids, override_conflicts, tenantId);

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error assigning multiple roles:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to assign multiple roles'
      },
      { status: 500 }
    );
  }
}