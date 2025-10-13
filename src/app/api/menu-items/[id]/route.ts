/**
 * Menu Item Detail API Route
 *
 * GET    /api/menu-items/[id] - Get a single menu item
 * PATCH  /api/menu-items/[id] - Update a menu item (super admin only)
 * DELETE /api/menu-items/[id] - Delete a menu item (super admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { TYPES } from '@/lib/types';
import { MenuManagementService } from '@/services/MenuManagementService';
import type { IMenuItemRepository } from '@/repositories/menuItem.repository';
import { Gate } from '@/lib/access-gate';

/**
 * GET /api/menu-items/[id]
 * Returns a single menu item by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get tenant context
    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!tenantUser) {
      return NextResponse.json(
        { error: 'No tenant context available' },
        { status: 403 }
      );
    }

    const tenantId = tenantUser.tenant_id;

    // Get menu item repository
    const menuRepo = container.get<IMenuItemRepository>(TYPES.IMenuItemRepository);
    const { data: menuItem, error } = await menuRepo.findById(params.id);

    if (error || !menuItem) {
      return NextResponse.json(
        { error: 'Menu item not found' },
        { status: 404 }
      );
    }

    // Verify menu item belongs to user's tenant
    if (menuItem.tenant_id !== tenantId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: menuItem,
    });
  } catch (error) {
    console.error('Error fetching menu item:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch menu item',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/menu-items/[id]
 * Update a menu item (super admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check super admin access
    const gate = Gate.superAdminOnly();
    const accessResult = await gate.check(user.id);

    if (!accessResult.allowed) {
      return NextResponse.json(
        { error: 'Forbidden: Super admin access required' },
        { status: 403 }
      );
    }

    // Get tenant context
    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!tenantUser) {
      return NextResponse.json(
        { error: 'No tenant context available' },
        { status: 403 }
      );
    }

    const tenantId = tenantUser.tenant_id;

    // Parse request body
    const body = await request.json();

    // Get menu management service
    const menuManagementService = container.get<MenuManagementService>(TYPES.MenuManagementService);

    // Update menu item
    const result = await menuManagementService.updateMenuItem(
      params.id,
      body,
      tenantId,
      user.id
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.message,
          errors: result.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Error updating menu item:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update menu item',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/menu-items/[id]
 * Delete a menu item (super admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check super admin access
    const gate = Gate.superAdminOnly();
    const accessResult = await gate.check(user.id);

    if (!accessResult.allowed) {
      return NextResponse.json(
        { error: 'Forbidden: Super admin access required' },
        { status: 403 }
      );
    }

    // Get tenant context
    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!tenantUser) {
      return NextResponse.json(
        { error: 'No tenant context available' },
        { status: 403 }
      );
    }

    const tenantId = tenantUser.tenant_id;

    // Get menu management service
    const menuManagementService = container.get<MenuManagementService>(TYPES.MenuManagementService);

    // Delete menu item
    const result = await menuManagementService.deleteMenuItem(
      params.id,
      tenantId,
      user.id
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Menu item deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete menu item',
      },
      { status: 500 }
    );
  }
}
