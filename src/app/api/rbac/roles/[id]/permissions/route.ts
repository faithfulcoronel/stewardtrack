import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentTenantId } from '@/lib/server/context';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/rbac/roles/[id]/permissions
 * Get all permissions assigned to a role
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createSupabaseServerClient();
    const tenantId = await getCurrentTenantId();
    const { id: roleId } = await params;

    // Get role permissions with permission details
    const { data: rolePermissions, error } = await supabase
      .from('role_permissions')
      .select(`
        permission_id,
        permissions (
          id,
          code,
          name,
          description,
          module,
          resource_type,
          action
        )
      `)
      .eq('role_id', roleId)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Error fetching role permissions:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch role permissions'
        },
        { status: 500 }
      );
    }

    // Extract permissions from the join
    const permissions = rolePermissions?.map((rp: any) => rp.permissions).filter(Boolean) || [];

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
    const supabase = await createSupabaseServerClient();
    const tenantId = await getCurrentTenantId();
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

    // Verify the role exists and belongs to the tenant
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('id, name, is_system')
      .eq('id', roleId)
      .eq('tenant_id', tenantId)
      .single();

    if (roleError || !role) {
      return NextResponse.json(
        {
          success: false,
          error: 'Role not found or access denied'
        },
        { status: 404 }
      );
    }

    // Don't allow modifying system roles
    if (role.is_system) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot modify permissions for system roles'
        },
        { status: 403 }
      );
    }

    // Delete existing role permissions
    const { error: deleteError } = await supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)
      .eq('tenant_id', tenantId);

    if (deleteError) {
      console.error('Error deleting existing permissions:', deleteError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update role permissions'
        },
        { status: 500 }
      );
    }

    // Insert new permissions if any
    if (body.permission_ids.length > 0) {
      const rolePermissions = body.permission_ids.map((permissionId: string) => ({
        role_id: roleId,
        permission_id: permissionId,
        tenant_id: tenantId
      }));

      const { error: insertError } = await supabase
        .from('role_permissions')
        .insert(rolePermissions);

      if (insertError) {
        console.error('Error inserting new permissions:', insertError);
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to assign permissions to role'
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Role permissions updated successfully',
      data: {
        role_id: roleId,
        permission_count: body.permission_ids.length
      }
    });
  } catch (error) {
    console.error('Error in PUT /api/rbac/roles/[id]/permissions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update role permissions'
      },
      { status: 500 }
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
    const supabase = await createSupabaseServerClient();
    const tenantId = await getCurrentTenantId();
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

    // Verify the role exists and belongs to the tenant
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('id, name, is_system')
      .eq('id', roleId)
      .eq('tenant_id', tenantId)
      .single();

    if (roleError || !role) {
      return NextResponse.json(
        {
          success: false,
          error: 'Role not found or access denied'
        },
        { status: 404 }
      );
    }

    // Don't allow modifying system roles
    if (role.is_system) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot modify permissions for system roles'
        },
        { status: 403 }
      );
    }

    // Insert new permissions
    const rolePermissions = body.permission_ids.map((permissionId: string) => ({
      role_id: roleId,
      permission_id: permissionId,
      tenant_id: tenantId
    }));

    const { error: insertError } = await supabase
      .from('role_permissions')
      .upsert(rolePermissions, {
        onConflict: 'role_id,permission_id,tenant_id',
        ignoreDuplicates: true
      });

    if (insertError) {
      console.error('Error adding permissions:', insertError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to add permissions to role'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Permissions added to role successfully',
      data: {
        role_id: roleId,
        added_count: body.permission_ids.length
      }
    });
  } catch (error) {
    console.error('Error in POST /api/rbac/roles/[id]/permissions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add permissions to role'
      },
      { status: 500 }
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
    const supabase = await createSupabaseServerClient();
    const tenantId = await getCurrentTenantId();
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

    // Verify the role exists and belongs to the tenant
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('id, name, is_system')
      .eq('id', roleId)
      .eq('tenant_id', tenantId)
      .single();

    if (roleError || !role) {
      return NextResponse.json(
        {
          success: false,
          error: 'Role not found or access denied'
        },
        { status: 404 }
      );
    }

    // Don't allow modifying system roles
    if (role.is_system) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot modify permissions for system roles'
        },
        { status: 403 }
      );
    }

    // Delete specified permissions
    const { error: deleteError } = await supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)
      .eq('tenant_id', tenantId)
      .in('permission_id', body.permission_ids);

    if (deleteError) {
      console.error('Error removing permissions:', deleteError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to remove permissions from role'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Permissions removed from role successfully',
      data: {
        role_id: roleId,
        removed_count: body.permission_ids.length
      }
    });
  } catch (error) {
    console.error('Error in DELETE /api/rbac/roles/[id]/permissions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove permissions from role'
      },
      { status: 500 }
    );
  }
}