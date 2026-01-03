import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';
import { AssignRoleDto } from '@/models/rbac.model';

interface RouteParams {
  params: Promise<{
    userId: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params;
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || undefined;

    console.log(`[API /rbac/users/${userId}/roles] Fetching roles, tenantId=${tenantId}`);
    const userWithRoles = await rbacService.getUserWithRoles(userId, tenantId);
    console.log(`[API /rbac/users/${userId}/roles] Result:`, JSON.stringify(userWithRoles, null, 2));

    if (!userWithRoles) {
      console.log(`[API /rbac/users/${userId}/roles] User not found, returning 404`);
      return NextResponse.json(
        {
          success: false,
          error: 'User not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: userWithRoles
    });
  } catch (error) {
    console.error('Error fetching user roles:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user roles'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params;
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const body = await request.json();

    if (!body.role_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'role_id is required'
        },
        { status: 400 }
      );
    }

    const assignRoleDto: AssignRoleDto = {
      user_id: userId,
      role_id: body.role_id,
      expires_at: body.expires_at
    };

    const userRole = await rbacService.assignRole(assignRoleDto, undefined, body.assigned_by);

    return NextResponse.json({
      success: true,
      data: userRole
    });
  } catch (error) {
    console.error('Error assigning role:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to assign role'
      },
      { status: 500 }
    );
  }
}