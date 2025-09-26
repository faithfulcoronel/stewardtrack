import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RbacService } from '@/services/rbac.service';
import { CreateRoleDto } from '@/models/rbac.model';

export async function GET(request: NextRequest) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const { searchParams } = new URL(request.url);
    const includeSystem = searchParams.get('includeSystem') === 'true';
    const includeStats = searchParams.get('includeStats') === 'true';
    const delegatable = searchParams.get('delegatable') === 'true';
    const tenantId = searchParams.get('tenantId') || undefined;

    let roles;
    if (includeStats) {
      roles = await rbacService.getRoleStatistics(tenantId, includeSystem);
    } else {
      roles = await rbacService.getRoles(tenantId, includeSystem);
    }

    // Filter for delegatable roles if requested
    if (delegatable && Array.isArray(roles)) {
      roles = roles.filter((role: any) => role.is_delegatable === true);
    }

    return NextResponse.json({
      success: true,
      data: roles
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch roles'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const body: CreateRoleDto = await request.json();

    // Validate required fields
    if (!body.name || !body.scope) {
      return NextResponse.json(
        {
          success: false,
          error: 'Name and scope are required'
        },
        { status: 400 }
      );
    }

    const role = await rbacService.createRole(body);

    return NextResponse.json({
      success: true,
      data: role
    });
  } catch (error) {
    console.error('Error creating role:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create role'
      },
      { status: 500 }
    );
  }
}