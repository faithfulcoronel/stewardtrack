import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { authUtils } from '@/utils/authUtils';

/**
 * GET /api/licensing/analytics
 * Gets system-wide licensing analytics for super_admin users
 * This includes metrics across ALL tenants in the system
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await authUtils.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's admin role
    const { data: adminRole } = await supabase.rpc('get_user_admin_role');

    if (adminRole !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Only super admins can view system analytics.' },
        { status: 403 }
      );
    }

    // Get total product offerings
    const { count: totalOfferings } = await supabase
      .from('product_offerings')
      .select('*', { count: 'exact', head: true });

    const { count: activeOfferings } = await supabase
      .from('product_offerings')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get total feature bundles
    const { count: totalBundles } = await supabase
      .from('feature_bundles')
      .select('*', { count: 'exact', head: true });

    // Get total features across all bundles
    const { count: totalFeatures } = await supabase
      .from('bundle_features')
      .select('*', { count: 'exact', head: true });

    // Get active subscriptions (tenants with active offerings)
    const { count: activeSubscriptions } = await supabase
      .from('tenant_product_offerings')
      .select('*', { count: 'exact', head: true })
      .lte('starts_at', new Date().toISOString())
      .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`);

    // Get subscriptions by tier
    const { data: subscriptionsByTier } = await supabase
      .from('tenant_product_offerings')
      .select(`
        product_offering_id,
        product_offerings!inner(tier)
      `)
      .lte('starts_at', new Date().toISOString())
      .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`);

    // Group by tier
    const tierCounts: Record<string, number> = {};
    subscriptionsByTier?.forEach((sub: any) => {
      const tier = sub.product_offerings?.tier || 'Unknown';
      tierCounts[tier] = (tierCounts[tier] || 0) + 1;
    });

    const formattedTierData = Object.entries(tierCounts).map(([tier, count]) => ({
      tier,
      count,
    }));

    // Get feature adoption (features granted to tenants)
    const { data: featureAdoption } = await supabase
      .from('tenant_feature_grants')
      .select(`
        feature_id,
        features!inner(feature_code, feature_name)
      `)
      .lte('starts_at', new Date().toISOString())
      .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`);

    // Count tenants per feature
    const featureCounts: Record<string, { feature_code: string; feature_name: string; count: number }> = {};
    featureAdoption?.forEach((grant: any) => {
      const featureId = grant.feature_id;
      const feature = grant.features;
      if (feature) {
        if (!featureCounts[featureId]) {
          featureCounts[featureId] = {
            feature_code: feature.feature_code,
            feature_name: feature.feature_name,
            count: 0,
          };
        }
        featureCounts[featureId].count++;
      }
    });

    const formattedFeatureAdoption = Object.values(featureCounts)
      .sort((a, b) => b.count - a.count)
      .map(f => ({
        feature_code: f.feature_code,
        feature_name: f.feature_name,
        tenant_count: f.count,
      }));

    // Get manual license assignment statistics
    const { count: totalAssignments } = await supabase
      .from('license_assignments')
      .select('*', { count: 'exact', head: true });

    // Get recent assignments (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { count: recentAssignments } = await supabase
      .from('license_assignments')
      .select('*', { count: 'exact', head: true })
      .gte('assigned_at', thirtyDaysAgo.toISOString());

    // Get assignment activity by offering tier
    const { data: assignmentsByTier } = await supabase
      .from('license_assignments')
      .select(`
        offering_id,
        product_offerings!inner(tier)
      `)
      .gte('assigned_at', thirtyDaysAgo.toISOString());

    const assignmentTierCounts: Record<string, number> = {};
    assignmentsByTier?.forEach((assignment: any) => {
      const tier = assignment.product_offerings?.tier || 'Unknown';
      assignmentTierCounts[tier] = (assignmentTierCounts[tier] || 0) + 1;
    });

    const formattedAssignmentsByTier = Object.entries(assignmentTierCounts).map(([tier, count]) => ({
      tier,
      count,
    }));

    // Get most recent assignments for timeline
    const { data: recentAssignmentDetails } = await supabase
      .from('license_assignments')
      .select(`
        id,
        assigned_at,
        tenants!inner(name),
        product_offerings!inner(name, tier)
      `)
      .order('assigned_at', { ascending: false })
      .limit(10);

    const formattedRecentAssignments = recentAssignmentDetails?.map((assignment: any) => ({
      assignment_id: assignment.id,
      assigned_at: assignment.assigned_at,
      tenant_name: assignment.tenants?.name || 'Unknown',
      offering_name: assignment.product_offerings?.name || 'Unknown',
      offering_tier: assignment.product_offerings?.tier || 'Unknown',
    })) || [];

    const summary = {
      totalOfferings: totalOfferings || 0,
      activeOfferings: activeOfferings || 0,
      totalBundles: totalBundles || 0,
      totalFeatures: totalFeatures || 0,
      activeSubscriptions: activeSubscriptions || 0,
      subscriptionsByTier: formattedTierData,
      featureAdoption: formattedFeatureAdoption,
      manualAssignments: {
        total: totalAssignments || 0,
        last30Days: recentAssignments || 0,
        byTier: formattedAssignmentsByTier,
        recent: formattedRecentAssignments,
      },
    };

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Error fetching licensing analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch licensing analytics',
      },
      { status: 500 }
    );
  }
}
