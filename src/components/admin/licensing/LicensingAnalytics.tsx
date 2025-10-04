'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Users, Package, Award, DollarSign, Activity, History, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface LicensingSummary {
  totalOfferings: number;
  activeOfferings: number;
  totalBundles: number;
  totalFeatures: number;
  activeSubscriptions: number;
  subscriptionsByTier: {
    tier: string;
    count: number;
  }[];
  featureAdoption: {
    feature_code: string;
    feature_name: string;
    tenant_count: number;
  }[];
  revenueByTier?: {
    tier: string;
    revenue: number;
  }[];
  manualAssignments?: {
    total: number;
    last30Days: number;
    byTier: {
      tier: string;
      count: number;
    }[];
    recent: {
      assignment_id: string;
      assigned_at: string;
      tenant_name: string;
      offering_name: string;
      offering_tier: string;
    }[];
  };
}

export function LicensingAnalytics() {
  const [metrics, setMetrics] = useState<LicensingSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 30000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  async function loadMetrics() {
    try {
      const response = await fetch('/api/licensing/analytics');
      const result = await response.json();

      if (result.success) {
        setMetrics(result.data);
      } else {
        toast.error(result.error || 'Failed to load metrics');
      }
    } catch (error) {
      console.error('Error loading metrics:', error);
      toast.error('Failed to load licensing metrics');
    } finally {
      setIsLoading(false);
    }
  }

  function getTierColor(tier: string) {
    switch (tier.toLowerCase()) {
      case 'starter':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'professional':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'enterprise':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-12 text-gray-500">
          <div className="text-center">
            <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No analytics data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Offerings
            </CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalOfferings}</div>
            <p className="text-xs text-gray-500 mt-1">
              {metrics.activeOfferings} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Feature Bundles
            </CardTitle>
            <Award className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalBundles}</div>
            <p className="text-xs text-gray-500 mt-1">
              {metrics.totalFeatures} total features
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Subscriptions
            </CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeSubscriptions}</div>
            <p className="text-xs text-gray-500 mt-1">
              Across all tiers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Growth Trend
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+12%</div>
            <p className="text-xs text-gray-500 mt-1">
              Last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions by Tier */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Subscriptions by Tier</CardTitle>
            <CardDescription>Current distribution of active subscriptions</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.subscriptionsByTier && metrics.subscriptionsByTier.length > 0 ? (
              <div className="space-y-4">
                {metrics.subscriptionsByTier.map((item) => (
                  <div key={item.tier} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={getTierColor(item.tier)}>
                        {item.tier}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-gray-500">{item.count} subscriptions</div>
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${metrics.activeSubscriptions > 0 ? (item.count / metrics.activeSubscriptions) * 100 : 0}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No subscription data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feature Adoption</CardTitle>
            <CardDescription>Most utilized features across tenants</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.featureAdoption && metrics.featureAdoption.length > 0 ? (
              <div className="space-y-3">
                {metrics.featureAdoption.slice(0, 5).map((feature) => (
                  <div key={feature.feature_code} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{feature.feature_name}</div>
                      <div className="text-xs text-gray-500">{feature.feature_code}</div>
                    </div>
                    <Badge variant="secondary" className="ml-2">
                      {feature.tenant_count} tenants
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No feature adoption data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Tier (Optional) */}
      {metrics.revenueByTier && metrics.revenueByTier.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Revenue by Tier
            </CardTitle>
            <CardDescription>Monthly recurring revenue distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {metrics.revenueByTier.map((item) => (
                <div key={item.tier} className="p-4 border rounded-lg">
                  <Badge variant="outline" className={getTierColor(item.tier)}>
                    {item.tier}
                  </Badge>
                  <div className="text-2xl font-bold mt-2">
                    ${item.revenue.toFixed(2)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Monthly MRR</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual License Assignments */}
      {metrics.manualAssignments && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Manual License Assignments
              </CardTitle>
              <CardDescription>License assignments performed by administrators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Total Assignments</div>
                    <div className="text-2xl font-bold">{metrics.manualAssignments.total}</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Last 30 Days</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {metrics.manualAssignments.last30Days}
                    </div>
                  </div>
                </div>

                {metrics.manualAssignments.byTier && metrics.manualAssignments.byTier.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">Assignments by Tier (Last 30 Days)</div>
                    {metrics.manualAssignments.byTier.map((item) => (
                      <div key={item.tier} className="flex items-center justify-between">
                        <Badge variant="outline" className={getTierColor(item.tier)}>
                          {item.tier}
                        </Badge>
                        <span className="text-sm text-gray-600">{item.count} assignments</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Assignment Activity
              </CardTitle>
              <CardDescription>Latest 10 license assignments</CardDescription>
            </CardHeader>
            <CardContent>
              {metrics.manualAssignments.recent && metrics.manualAssignments.recent.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {metrics.manualAssignments.recent.map((assignment) => (
                    <div key={assignment.assignment_id} className="border-b pb-3 last:border-b-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{assignment.tenant_name}</div>
                          <div className="text-xs text-gray-500">
                            {assignment.offering_name}
                          </div>
                        </div>
                        <Badge variant="outline" className={getTierColor(assignment.offering_tier)}>
                          {assignment.offering_tier}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(assignment.assigned_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No recent assignment activity</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Auto-refresh indicator */}
      <div className="flex justify-center text-xs text-gray-500">
        <Activity className="h-3 w-3 mr-1" />
        Auto-refreshing every 30 seconds
      </div>
    </div>
  );
}
