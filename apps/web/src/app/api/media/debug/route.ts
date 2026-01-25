import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseServiceClient } from '@/lib/supabase/service';
import { tenantUtils } from '@/utils/tenantUtils';

/**
 * GET /api/media/debug
 * Debug endpoint to check tenant_media table access
 */
export async function GET(request: NextRequest) {
  try {
    // Get tenant ID
    const tenantId = await tenantUtils.getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
    }

    // Try with service client
    const serviceClient = await getSupabaseServiceClient();

    // Direct query without any filters first
    const { data: allData, error: allError } = await serviceClient
      .from('tenant_media')
      .select('*')
      .limit(10);

    // Query with tenant filter
    const { data: tenantData, error: tenantError } = await serviceClient
      .from('tenant_media')
      .select('*')
      .eq('tenant_id', tenantId)
      .limit(10);

    // Query with tenant + not deleted filter
    const { data: filteredData, error: filteredError } = await serviceClient
      .from('tenant_media')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .limit(10);

    // Count total records
    const { count: totalCount } = await serviceClient
      .from('tenant_media')
      .select('*', { count: 'exact', head: true });

    // Count tenant records
    const { count: tenantCount } = await serviceClient
      .from('tenant_media')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    // Get storage usage via RPC
    const { data: storageData, error: storageError } = await serviceClient.rpc(
      'get_tenant_storage_usage',
      { p_tenant_id: tenantId }
    );

    return NextResponse.json({
      tenantId,
      debug: {
        allRecords: {
          count: allData?.length ?? 0,
          error: allError?.message ?? null,
          sample: allData?.slice(0, 2) ?? [],
        },
        tenantRecords: {
          count: tenantData?.length ?? 0,
          error: tenantError?.message ?? null,
          sample: tenantData?.slice(0, 2) ?? [],
        },
        filteredRecords: {
          count: filteredData?.length ?? 0,
          error: filteredError?.message ?? null,
          sample: filteredData?.slice(0, 2) ?? [],
        },
        counts: {
          total: totalCount,
          tenant: tenantCount,
        },
        storageUsage: {
          data: storageData,
          error: storageError?.message ?? null,
        },
      },
    });
  } catch (error) {
    console.error('[GET /api/media/debug] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Debug failed' },
      { status: 500 }
    );
  }
}
