import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/service';

/**
 * GET /api/tenant/public/[tenantId]
 *
 * Fetches public tenant information for display on the join page.
 * This endpoint is publicly accessible (no auth required).
 * Uses service role client to bypass RLS.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    console.log('[API] Fetching public tenant info for:', tenantId);

    // Use service role client to bypass RLS for public tenant info
    const supabase = await getSupabaseServiceClient();

    // Fetch only public tenant information
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, name, logo_url, church_image_url')
      .eq('id', tenantId)
      .single();

    if (error) {
      console.error('Error fetching tenant:', error, 'tenantId:', tenantId);
      return NextResponse.json(
        { error: 'Tenant not found', details: error.message },
        { status: 404 }
      );
    }

    if (!tenant) {
      console.error('Tenant not found for ID:', tenantId);
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: tenant.id,
      name: tenant.name,
      logo_url: tenant.logo_url,
      church_image_url: tenant.church_image_url,
    });
  } catch (error) {
    console.error('Error fetching tenant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
