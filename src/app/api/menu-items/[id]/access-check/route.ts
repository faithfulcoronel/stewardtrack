/**
 * Menu Item Access Check API Route
 *
 * GET /api/menu-items/[id]/access-check - Check if user has access to menu item
 */

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { TYPES } from '@/lib/types';
import { MenuAccessService } from '@/services/MenuAccessService';

/**
 * GET /api/menu-items/[id]/access-check
 * Checks if the authenticated user has access to a specific menu item
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
      return NextResponse.json({
        allowed: false,
        reason: 'Unauthorized'
      });
    }

    // Get tenant context
    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!tenantUser) {
      return NextResponse.json({
        allowed: false,
        reason: 'No tenant context available'
      });
    }

    const tenantId = tenantUser.tenant_id;

    // Get menu access service
    const menuAccessService = container.get<MenuAccessService>(TYPES.MenuAccessService);

    // Check access
    const result = await menuAccessService.checkAccess(
      params.id,
      user.id,
      tenantId
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error checking menu item access:', error);
    return NextResponse.json({
      allowed: false,
      reason: error instanceof Error ? error.message : 'Access check failed'
    });
  }
}
