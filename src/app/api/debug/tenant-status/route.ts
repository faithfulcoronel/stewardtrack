import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/service';

/**
 * GET /api/debug/tenant-status?tenantId=xxx
 *
 * Diagnostic endpoint to check tenant provisioning status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 });
    }

    const supabase = await getSupabaseServiceClient();

    // Check roles
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('id, code, name, metadata_key, is_system')
      .eq('tenant_id', tenantId);

    // Check permissions
    const { data: permissions, error: permissionsError } = await supabase
      .from('permissions')
      .select('id, code, name, source, source_reference')
      .eq('tenant_id', tenantId);

    // Check role_permissions
    const { data: rolePermissions, error: rpError } = await supabase
      .from('role_permissions')
      .select(`
        id,
        role:roles(code, name),
        permission:permissions(code, name)
      `)
      .in('role_id', (roles || []).map(r => r.id));

    // Check surface bindings
    const { data: surfaceBindings, error: sbError } = await supabase
      .from('rbac_surface_bindings')
      .select('id, surface_id, required_feature_code, is_active')
      .eq('tenant_id', tenantId);

    // Check tenant feature grants
    const { data: featureGrants, error: fgError } = await supabase
      .from('tenant_feature_grants')
      .select(`
        id,
        feature:feature_catalog(code, name)
      `)
      .eq('tenant_id', tenantId);

    return NextResponse.json({
      success: true,
      tenant_id: tenantId,
      status: {
        roles: {
          count: roles?.length || 0,
          data: roles || [],
          error: rolesError?.message
        },
        permissions: {
          count: permissions?.length || 0,
          data: permissions || [],
          error: permissionsError?.message
        },
        rolePermissions: {
          count: rolePermissions?.length || 0,
          data: rolePermissions || [],
          error: rpError?.message
        },
        surfaceBindings: {
          count: surfaceBindings?.length || 0,
          data: surfaceBindings || [],
          error: sbError?.message
        },
        featureGrants: {
          count: featureGrants?.length || 0,
          data: featureGrants || [],
          error: fgError?.message
        }
      }
    });
  } catch (error) {
    console.error('Tenant status check error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check tenant status'
    }, { status: 500 });
  }
}
