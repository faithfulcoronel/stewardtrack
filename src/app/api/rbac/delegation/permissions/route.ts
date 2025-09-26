import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';

export async function GET(_request: NextRequest) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);

    const delegationPermissions = await rbacService.getDelegationPermissions();

    return NextResponse.json({
      success: true,
      data: delegationPermissions
    });
  } catch (error) {
    console.error('Error fetching delegation permissions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch delegation permissions'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const body = await request.json();

    const {
      delegatee_id,
      scope_type,
      scope_id,
      permissions,
      restrictions = [],
      expiry_date
    } = body;

    if (!delegatee_id || !scope_type || !scope_id || !permissions || permissions.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'delegatee_id, scope_type, scope_id, and permissions are required'
        },
        { status: 400 }
      );
    }

    const delegationPermission = await rbacService.createDelegationPermission({
      delegatee_id,
      scope_type,
      scope_id,
      permissions,
      restrictions,
      expiry_date
    });

    return NextResponse.json({
      success: true,
      data: delegationPermission
    });
  } catch (error) {
    console.error('Error creating delegation permission:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create delegation permission'
      },
      { status: 500 }
    );
  }
}