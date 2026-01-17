import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { AuthorizationService } from '@/services/AuthorizationService';
import { RolePermissionService } from '@/services/RolePermissionService';
import type { TenantService } from '@/services/TenantService';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/rbac/roles/[id]/permissions
 * Get all permissions assigned to a role
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode }
      );
    }

    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const tenant = await tenantService.getCurrentTenant();

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'No tenant context available' },
        { status: 400 }
      );
    }

    const rolePermissionService = container.get<RolePermissionService>(TYPES.RolePermissionService);
    const { id: roleId } = await params;

    const permissions = await rolePermissionService.getRolePermissions(roleId, tenant.id);

    return NextResponse.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('Error in GET /api/rbac/roles/[id]/permissions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch role permissions'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/rbac/roles/[id]/permissions
 * Update permissions assigned to a role (replaces all existing permissions)
 * Body: { permission_ids: string[] }
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode }
      );
    }

    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const tenant = await tenantService.getCurrentTenant();

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'No tenant context available' },
        { status: 400 }
      );
    }

    const rolePermissionService = container.get<RolePermissionService>(TYPES.RolePermissionService);
    const { id: roleId } = await params;
    const body = await request.json();

    if (!body.permission_ids || !Array.isArray(body.permission_ids)) {
      return NextResponse.json(
        {
          success: false,
          error: 'permission_ids array is required'
        },
        { status: 400 }
      );
    }

    const result = await rolePermissionService.replaceRolePermissions(roleId, body.permission_ids, tenant.id);

    return NextResponse.json({
      success: true,
      message: 'Role permissions updated successfully',
      data: result
    });
  } catch (error) {
    console.error('Error in PUT /api/rbac/roles/[id]/permissions:', error);

    const message = error instanceof Error ? error.message : 'Failed to update role permissions';
    const status =
      message.includes('not found') ? 404 :
      message.includes('system roles') ? 403 : 500;

    return NextResponse.json(
      {
        success: false,
        error: message
      },
      { status }
    );
  }
}

/**
 * POST /api/rbac/roles/[id]/permissions
 * Add permissions to a role (without removing existing ones)
 * Body: { permission_ids: string[] }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode }
      );
    }

    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const tenant = await tenantService.getCurrentTenant();

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'No tenant context available' },
        { status: 400 }
      );
    }

    const rolePermissionService = container.get<RolePermissionService>(TYPES.RolePermissionService);
    const { id: roleId } = await params;
    const body = await request.json();

    if (!body.permission_ids || !Array.isArray(body.permission_ids)) {
      return NextResponse.json(
        {
          success: false,
          error: 'permission_ids array is required'
        },
        { status: 400 }
      );
    }

    const result = await rolePermissionService.addPermissions(roleId, body.permission_ids, tenant.id);

    return NextResponse.json({
      success: true,
      message: 'Permissions added to role successfully',
      data: result
    });
  } catch (error) {
    console.error('Error in POST /api/rbac/roles/[id]/permissions:', error);

    const message = error instanceof Error ? error.message : 'Failed to add permissions to role';
    const status =
      message.includes('not found') ? 404 :
      message.includes('system roles') ? 403 : 500;

    return NextResponse.json(
      {
        success: false,
        error: message
      },
      { status }
    );
  }
}

/**
 * DELETE /api/rbac/roles/[id]/permissions
 * Remove specific permissions from a role
 * Body: { permission_ids: string[] }
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode }
      );
    }

    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const tenant = await tenantService.getCurrentTenant();

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'No tenant context available' },
        { status: 400 }
      );
    }

    const rolePermissionService = container.get<RolePermissionService>(TYPES.RolePermissionService);
    const { id: roleId } = await params;
    const body = await request.json();

    if (!body.permission_ids || !Array.isArray(body.permission_ids)) {
      return NextResponse.json(
        {
          success: false,
          error: 'permission_ids array is required'
        },
        { status: 400 }
      );
    }

    const result = await rolePermissionService.removePermissions(roleId, body.permission_ids, tenant.id);

    return NextResponse.json({
      success: true,
      message: 'Permissions removed from role successfully',
      data: result
    });
  } catch (error) {
    console.error('Error in DELETE /api/rbac/roles/[id]/permissions:', error);

    const message = error instanceof Error ? error.message : 'Failed to remove permissions from role';
    const status =
      message.includes('not found') ? 404 :
      message.includes('system roles') ? 403 : 500;

    return NextResponse.json(
      {
        success: false,
        error: message
      },
      { status }
    );
  }
}
