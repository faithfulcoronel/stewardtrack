/**
 * Menu Items API Route
 *
 * GET  /api/menu-items - List all menu items for the tenant
 * POST /api/menu-items - Create a new menu item (super admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { TYPES } from '@/lib/types';
import { MenuRenderingService } from '@/services/MenuRenderingService';
import { MenuManagementService } from '@/services/MenuManagementService';
import { Gate } from '@/lib/access-gate';

/**
 * GET /api/menu-items
 * Returns all menu items for the authenticated user's tenant
 */
export async function GET(request: NextRequest) {
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

    // Get menu rendering service
    const menuRenderingService = container.get<MenuRenderingService>(TYPES.MenuRenderingService);

    // Parse query parameters
    const url = new URL(request.url);
    const includeHidden = url.searchParams.get('includeHidden') === 'true';
    const includeSystem = url.searchParams.get('includeSystem') === 'true';
    const section = url.searchParams.get('section') || undefined;
    const format = url.searchParams.get('format') || 'flat'; // 'flat' or 'hierarchy'

    // Get menu items
    const options = {
      includeHidden,
      includeSystem,
      filterBySection: section,
    };

    if (format === 'hierarchy') {
      const hierarchy = await menuRenderingService.getMenuHierarchy(tenantId, options);
      return NextResponse.json({
        success: true,
        data: hierarchy,
        format: 'hierarchy',
      });
    } else if (format === 'sections') {
      const sections = await menuRenderingService.getMenuItemsBySection(tenantId, options);
      return NextResponse.json({
        success: true,
        data: sections,
        format: 'sections',
      });
    } else {
      const menuItems = await menuRenderingService.getFlatMenuItems(tenantId, options);
      return NextResponse.json({
        success: true,
        data: menuItems,
        format: 'flat',
      });
    }
  } catch (error) {
    console.error('Error fetching menu items:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch menu items',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/menu-items
 * Create a new menu item (super admin only)
 */
export async function POST(request: NextRequest) {
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

    // Create menu item
    const result = await menuManagementService.createMenuItem(body, tenantId, user.id);

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
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating menu item:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create menu item',
      },
      { status: 500 }
    );
  }
}
