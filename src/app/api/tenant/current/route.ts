import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Tenant } from '@/models/tenant.model';

/**
 * GET /api/tenant/current
 *
 * Retrieves the current tenant's information.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    // Fetch tenant data via RPC to avoid ambiguous column issues
    const { data: tenantData, error: tenantError } = await supabase.rpc('get_current_tenant');

    if (tenantError) {
      throw new Error(`Failed to fetch tenant: ${tenantError.message}`);
    }

    const tenantResult = Array.isArray(tenantData) ? tenantData[0] : tenantData;
    const tenant = tenantResult as Tenant | undefined;

    if (!tenant) {
      return NextResponse.json(
        {
          success: false,
          error: 'No tenant context available',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    console.error('Error fetching current tenant:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch tenant',
      },
      { status: 500 }
    );
  }
}
