/**
 * Menu Items Reorder API Route
 *
 * POST /api/menu-items/reorder - Reorder menu items (super admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { TYPES } from '@/lib/types';
import { MenuManagementService } from '@/services/MenuManagementService';
import { Gate } from '@/lib/access-gate';

interface ReorderRequest {
  items: Array<{ id: string; sort_order: number }>;
}

/**
 * POST /api/menu-items/reorder
 * Reorder menu items by updating sort_order (super admin only)
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
    const body: ReorderRequest = await request.json();

    if (!body.items || !Array.isArray(body.items)) {
      return NextResponse.json(
        { error: 'Invalid request: items array required' },
        { status: 400 }
      );
    }

    // Validate items structure
    for (const item of body.items) {
      if (!item.id || typeof item.sort_order !== 'number') {
        return NextResponse.json(
          { error: 'Invalid request: each item must have id and sort_order' },
          { status: 400 }
        );
      }
    }

    // Get menu management service
    const menuManagementService = container.get<MenuManagementService>(TYPES.MenuManagementService);

    // Reorder items
    const result = await menuManagementService.reorderMenuItems(
      body.items,
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
      message: 'Menu items reordered successfully',
    });
  } catch (error) {
    console.error('Error reordering menu items:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reorder menu items',
      },
      { status: 500 }
    );
  }
}
