import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { MaterializedViewRefreshService } from '@/services/MaterializedViewRefreshService';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /api/admin/refresh-views
 *
 * Manually triggers materialized view refresh operations.
 * Admin-only endpoint for managing view refresh.
 *
 * Request body:
 * - view?: string - Specific view to refresh (optional, defaults to all)
 * - force?: boolean - Force refresh even if recently refreshed
 *
 * Returns:
 * - Refresh metrics and status for each view
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has admin role
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role_id, roles(code)')
      .eq('user_id', user.id);

    const isAdmin = userRoles?.some((ur: any) =>
      ['super_admin', 'admin', 'system_admin'].includes(ur.roles?.code)
    );

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { view, force } = body;

    // Get refresh service
    const refreshService = container.get<MaterializedViewRefreshService>(
      MaterializedViewRefreshService
    );

    // Check if view needs refresh (unless force is true)
    if (!force && view) {
      const staleViews = await refreshService.getStaleViews(60); // 60 minutes
      if (!staleViews.includes(view)) {
        const history = await refreshService.getRefreshHistory(view, 1);
        return NextResponse.json({
          success: true,
          skipped: true,
          message: `View ${view} was recently refreshed`,
          lastRefresh: history[0] || null,
        });
      }
    }

    let metrics;

    if (view) {
      // Refresh specific view
      switch (view) {
        case 'tenant_user_effective_permissions':
          metrics = await refreshService.refreshTenantUserEffectivePermissions();
          break;
        case 'tenant_license_summary':
          metrics = await refreshService.refreshTenantLicenseSummary();
          break;
        case 'effective_surface_access':
          metrics = await refreshService.refreshEffectiveSurfaceAccess();
          break;
        default:
          return NextResponse.json(
            { error: `Unknown view: ${view}` },
            { status: 400 }
          );
      }

      return NextResponse.json({
        success: metrics.success,
        metrics,
      });
    } else {
      // Refresh all views
      metrics = await refreshService.refreshAllViews();

      const allSuccessful = metrics.every(m => m.success);

      return NextResponse.json({
        success: allSuccessful,
        metrics,
        summary: {
          total: metrics.length,
          successful: metrics.filter(m => m.success).length,
          failed: metrics.filter(m => !m.success).length,
          totalDurationMs: metrics.reduce((sum, m) => sum + m.durationMs, 0),
        },
      });
    }
  } catch (error: any) {
    console.error('Error refreshing views:', error);
    return NextResponse.json(
      {
        error: 'Failed to refresh views',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/refresh-views
 *
 * Gets refresh history and metrics for materialized views
 *
 * Query params:
 * - view?: string - Filter by specific view
 * - limit?: number - Number of records to return (default: 50)
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has admin role
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role_id, roles(code)')
      .eq('user_id', user.id);

    const isAdmin = userRoles?.some((ur: any) =>
      ['super_admin', 'admin', 'system_admin'].includes(ur.roles?.code)
    );

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Get refresh service
    const refreshService = container.get<MaterializedViewRefreshService>(
      MaterializedViewRefreshService
    );

    if (view) {
      // Get history for specific view
      const history = await refreshService.getRefreshHistory(view, limit);
      return NextResponse.json({
        view,
        history,
        count: history.length,
      });
    } else {
      // Get latest metrics for all views
      const latest = await refreshService.getLatestRefreshMetrics();
      const staleViews = await refreshService.getStaleViews(60);

      return NextResponse.json({
        latest,
        staleViews,
        summary: {
          total: latest.length,
          stale: staleViews.length,
          healthy: latest.filter(v => v.success).length,
        },
      });
    }
  } catch (error: any) {
    console.error('Error getting refresh metrics:', error);
    return NextResponse.json(
      {
        error: 'Failed to get refresh metrics',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
