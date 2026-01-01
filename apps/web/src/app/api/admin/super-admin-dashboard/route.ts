import { NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { AuthorizationService } from '@/services/AuthorizationService';
import { getSupabaseServiceClient } from '@/lib/supabase/service';

interface TenantSummary {
  id: string;
  name: string;
  status: 'active' | 'trial' | 'suspended' | 'expired';
  memberCount: number;
  licenseTier: string;
  lastActive: string;
}

interface SystemHealth {
  database: 'healthy' | 'degraded' | 'down';
  api: 'healthy' | 'degraded' | 'down';
  auth: 'healthy' | 'degraded' | 'down';
}

interface SuperAdminDashboardData {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  totalUsers: number;
  totalMembers: number;
  recentTenants: TenantSummary[];
  systemHealth: SystemHealth;
  licenseTierBreakdown: {
    essential: number;
    professional: number;
    enterprise: number;
    premium: number;
  };
}

/**
 * GET /api/admin/super-admin-dashboard
 * Gets system-wide dashboard data for super_admin users
 * This includes metrics across ALL tenants in the system
 */
export async function GET() {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.requireSuperAdmin();

    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode }
      );
    }

    // Use service role client to access all tenant data
    const supabase = await getSupabaseServiceClient();

    // Fetch tenant statistics
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, name, status, subscription_tier, subscription_status, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (tenantsError) {
      console.error('Error fetching tenants:', tenantsError);
      throw new Error('Failed to fetch tenant data');
    }

    // Count total users (from auth.users via tenant_users)
    const { count: totalUsers, error: usersError } = await supabase
      .from('tenant_users')
      .select('*', { count: 'exact', head: true });

    if (usersError) {
      console.error('Error fetching users count:', usersError);
    }

    // Count total members across all tenants
    const { count: totalMembers, error: membersError } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true });

    if (membersError) {
      console.error('Error fetching members count:', membersError);
    }

    // Calculate statistics
    const totalTenants = tenants?.length || 0;
    const activeTenants = tenants?.filter(t => t.status === 'active').length || 0;
    const trialTenants = tenants?.filter(t => t.subscription_status === 'trial').length || 0;

    // License tier breakdown
    const licenseTierBreakdown = {
      essential: tenants?.filter(t => t.subscription_tier?.toLowerCase() === 'essential').length || 0,
      professional: tenants?.filter(t => t.subscription_tier?.toLowerCase() === 'professional').length || 0,
      enterprise: tenants?.filter(t => t.subscription_tier?.toLowerCase() === 'enterprise').length || 0,
      premium: tenants?.filter(t => t.subscription_tier?.toLowerCase() === 'premium').length || 0,
    };

    // Get member counts per tenant for recent tenants
    const recentTenantIds = tenants?.slice(0, 5).map(t => t.id) || [];

    let memberCountsByTenant: Record<string, number> = {};
    if (recentTenantIds.length > 0) {
      const { data: memberCounts, error: countError } = await supabase
        .from('members')
        .select('tenant_id')
        .in('tenant_id', recentTenantIds);

      if (!countError && memberCounts) {
        memberCountsByTenant = memberCounts.reduce((acc, m) => {
          acc[m.tenant_id] = (acc[m.tenant_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      }
    }

    // Map recent tenants with member counts
    const recentTenants: TenantSummary[] = (tenants?.slice(0, 5) || []).map(t => ({
      id: t.id,
      name: t.name || 'Unnamed Tenant',
      status: mapTenantStatus(t.status, t.subscription_status),
      memberCount: memberCountsByTenant[t.id] || 0,
      licenseTier: t.subscription_tier || 'Unknown',
      lastActive: t.updated_at || t.created_at,
    }));

    // System health check (simple connectivity checks)
    const systemHealth = await checkSystemHealth(supabase);

    const data: SuperAdminDashboardData = {
      totalTenants,
      activeTenants,
      trialTenants,
      totalUsers: totalUsers || 0,
      totalMembers: totalMembers || 0,
      recentTenants,
      systemHealth,
      licenseTierBreakdown,
    };

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching super admin dashboard data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch dashboard data',
      },
      { status: 500 }
    );
  }
}

function mapTenantStatus(
  status: string | null,
  subscriptionStatus: string | null
): 'active' | 'trial' | 'suspended' | 'expired' {
  if (subscriptionStatus === 'trial') return 'trial';
  if (status === 'suspended' || subscriptionStatus === 'suspended') return 'suspended';
  if (subscriptionStatus === 'expired' || subscriptionStatus === 'cancelled') return 'expired';
  return 'active';
}

async function checkSystemHealth(supabase: Awaited<ReturnType<typeof getSupabaseServiceClient>>): Promise<SystemHealth> {
  let database: 'healthy' | 'degraded' | 'down' = 'healthy';
  let api: 'healthy' | 'degraded' | 'down' = 'healthy';
  let auth: 'healthy' | 'degraded' | 'down' = 'healthy';

  // Check database connectivity
  try {
    const startTime = Date.now();
    const { error } = await supabase.from('tenants').select('id').limit(1);
    const duration = Date.now() - startTime;

    if (error) {
      database = 'down';
    } else if (duration > 2000) {
      database = 'degraded';
    }
  } catch {
    database = 'down';
  }

  // API is healthy if we got this far
  api = 'healthy';

  // Check auth service
  try {
    const { error } = await supabase.auth.getUser();
    // Even if no user, no error means auth is working
    if (error && error.message !== 'User from sub claim in JWT does not exist') {
      auth = 'degraded';
    }
  } catch {
    auth = 'down';
  }

  return { database, api, auth };
}
