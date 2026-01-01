'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2,
  Package,
  Settings,
  Users,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Shield,
  Database,
} from 'lucide-react';

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

interface SuperAdminData {
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

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  isLoading,
}: {
  title: string;
  value: number | string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: { value: number; positive: boolean };
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4 rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-1" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-bold">{value}</div>
          {trend && (
            <span
              className={`text-xs ${trend.positive ? 'text-green-600' : 'text-red-600'}`}
            >
              {trend.positive ? '+' : ''}
              {trend.value}%
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function SystemHealthCard({
  health,
  isLoading,
}: {
  health?: SystemHealth;
  isLoading?: boolean;
}) {
  const getStatusColor = (status?: 'healthy' | 'degraded' | 'down') => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'down':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusIcon = (status?: 'healthy' | 'degraded' | 'down') => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'down':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const services = [
    { name: 'Database', status: health?.database, icon: Database },
    { name: 'API', status: health?.api, icon: Activity },
    { name: 'Authentication', status: health?.auth, icon: Shield },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5" />
          System Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {services.map(({ name, status, icon: ServiceIcon }) => (
          <div key={name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ServiceIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{name}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${getStatusColor(status)}`} />
              {getStatusIcon(status)}
              <span className="text-xs text-muted-foreground capitalize">
                {status || 'Unknown'}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function RecentTenantsCard({
  tenants,
  isLoading,
}: {
  tenants?: TenantSummary[];
  isLoading?: boolean;
}) {
  const getStatusBadge = (status: TenantSummary['status']) => {
    const variants: Record<TenantSummary['status'], { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      active: { variant: 'default', label: 'Active' },
      trial: { variant: 'secondary', label: 'Trial' },
      suspended: { variant: 'destructive', label: 'Suspended' },
      expired: { variant: 'outline', label: 'Expired' },
    };
    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Recent Tenants
        </CardTitle>
        <CardDescription>Latest organizations on the platform</CardDescription>
      </CardHeader>
      <CardContent>
        {tenants && tenants.length > 0 ? (
          <div className="space-y-4">
            {tenants.map((tenant) => (
              <div
                key={tenant.id}
                className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <p className="font-medium">{tenant.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {tenant.memberCount} members · {tenant.licenseTier}
                  </p>
                </div>
                {getStatusBadge(tenant.status)}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No tenants found
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function LicenseTierCard({
  breakdown,
  isLoading,
}: {
  breakdown?: SuperAdminData['licenseTierBreakdown'];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-8" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const tiers = [
    { name: 'Essential', count: breakdown?.essential || 0, color: 'bg-gray-500' },
    { name: 'Professional', count: breakdown?.professional || 0, color: 'bg-blue-500' },
    { name: 'Enterprise', count: breakdown?.enterprise || 0, color: 'bg-purple-500' },
    { name: 'Premium', count: breakdown?.premium || 0, color: 'bg-amber-500' },
  ];

  const total = tiers.reduce((sum, tier) => sum + tier.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="h-5 w-5" />
          License Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tiers.map((tier) => (
            <div key={tier.name} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>{tier.name}</span>
                <span className="font-medium">{tier.count}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${tier.color} transition-all duration-300`}
                  style={{ width: total > 0 ? `${(tier.count / total) * 100}%` : '0%' }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActionsCard() {
  const actions = [
    {
      title: 'Licensing Studio',
      description: 'Manage products, features, and bundles',
      href: '/admin/licensing',
      icon: Package,
    },
    {
      title: 'System Settings',
      description: 'Configure integrations and templates',
      href: '/admin/system-settings',
      icon: Settings,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
        <CardDescription>Common super admin tasks</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {actions.map((action) => (
          <Link key={action.href} href={action.href}>
            <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="p-2 rounded-md bg-primary/10">
                <action.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{action.title}</p>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

export function SuperAdminDashboard() {
  const [data, setData] = useState<SuperAdminData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/super-admin-dashboard');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      const result = await response.json();
      setData(result.data);
    } catch (err) {
      console.error('Failed to fetch super admin dashboard data:', err);
      // Set mock data for now until API is implemented
      setData({
        totalTenants: 0,
        activeTenants: 0,
        trialTenants: 0,
        totalUsers: 0,
        totalMembers: 0,
        recentTenants: [],
        systemHealth: {
          database: 'healthy',
          api: 'healthy',
          auth: 'healthy',
        },
        licenseTierBreakdown: {
          essential: 0,
          professional: 0,
          enterprise: 0,
          premium: 0,
        },
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive">{error}</p>
        <Button onClick={fetchData} className="mt-4" variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Platform-wide overview and system management
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm" disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Tenants"
          value={data?.totalTenants || 0}
          description="Organizations on platform"
          icon={Building2}
          isLoading={isLoading}
        />
        <MetricCard
          title="Active Tenants"
          value={data?.activeTenants || 0}
          description="Currently active"
          icon={CheckCircle2}
          isLoading={isLoading}
        />
        <MetricCard
          title="Trial Tenants"
          value={data?.trialTenants || 0}
          description="In trial period"
          icon={TrendingUp}
          isLoading={isLoading}
        />
        <MetricCard
          title="Total Users"
          value={data?.totalUsers || 0}
          description="Registered users"
          icon={Users}
          isLoading={isLoading}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Recent Tenants */}
        <div className="lg:col-span-2">
          <RecentTenantsCard tenants={data?.recentTenants} isLoading={isLoading} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <SystemHealthCard health={data?.systemHealth} isLoading={isLoading} />
          <LicenseTierCard breakdown={data?.licenseTierBreakdown} isLoading={isLoading} />
          <QuickActionsCard />
        </div>
      </div>
    </div>
  );
}
