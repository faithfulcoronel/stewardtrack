'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  Shield,
  Settings,
  Activity,
  UserCheck,
  Key,
  Lock,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DashboardStats {
  totalRoles: number;
  totalBundles: number;
  activeUsers: number;
  surfaceBindings: number;
  recentChanges: number;
  pendingApprovals: number;
}

interface RecentActivity {
  id: string;
  action: string;
  resource: string;
  user: string;
  timestamp: string;
  status: 'success' | 'pending' | 'warning';
}

interface PhaseStatus {
  phase: string;
  title: string;
  status: 'complete' | 'in_progress' | 'planned';
  description: string;
  route?: string;
}

export function RbacDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRoles: 0,
    totalBundles: 0,
    activeUsers: 0,
    surfaceBindings: 0,
    recentChanges: 0,
    pendingApprovals: 0
  });

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const phaseStatuses: PhaseStatus[] = [
    {
      phase: 'Phase A',
      title: 'Foundation Alignment',
      status: 'complete',
      description: 'RBAC dashboard and metadata registry established',
      route: '/admin/security/rbac'
    },
    {
      phase: 'Phase B',
      title: 'Role & Bundle Management',
      status: 'in_progress',
      description: 'Role explorer and permission bundle composer',
      route: '/admin/security/rbac/roles'
    },
    {
      phase: 'Phase C',
      title: 'Surface Binding Integration',
      status: 'planned',
      description: 'UI surface binding manager and license integration',
      route: '/admin/security/rbac/surfaces'
    },
    {
      phase: 'Phase D',
      title: 'Delegated Consoles',
      status: 'planned',
      description: 'Campus and ministry-scoped access management',
      route: '/admin/security/rbac/delegation'
    },
    {
      phase: 'Phase E',
      title: 'Operational Dashboards',
      status: 'planned',
      description: 'Audit timelines and metadata publishing oversight',
      route: '/admin/security/rbac/audit'
    }
  ];

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load dashboard statistics
      const [rolesRes, bundlesRes, surfaceBindingsRes, auditRes] = await Promise.all([
        fetch('/api/rbac/roles'),
        fetch('/api/rbac/bundles'),
        fetch('/api/rbac/surface-bindings'),
        fetch('/api/rbac/audit?limit=10')
      ]);

      const [roles, bundles, bindings, audit] = await Promise.all([
        rolesRes.json(),
        bundlesRes.json(),
        surfaceBindingsRes.json(),
        auditRes.json()
      ]);

      setStats({
        totalRoles: roles.success ? roles.data.length : 0,
        totalBundles: bundles.success ? bundles.data.length : 0,
        activeUsers: 0, // This would come from user management
        surfaceBindings: bindings.success ? bindings.data.length : 0,
        recentChanges: audit.success ? audit.data.length : 0,
        pendingApprovals: 0 // This would come from approval workflow
      });

      // Transform audit data to recent activity
      if (audit.success) {
        const activities: RecentActivity[] = audit.data.slice(0, 5).map((log: any) => ({
          id: log.id,
          action: log.action.replace(/_/g, ' ').toLowerCase(),
          resource: log.resource_type,
          user: log.user_id,
          timestamp: log.created_at,
          status: 'success' as const
        }));
        setRecentActivity(activities);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPhaseStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'planned': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPhaseStatusIcon = (status: string) => {
    switch (status) {
      case 'complete': return <CheckCircle className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'planned': return <Settings className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const getActivityStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'pending': return 'text-yellow-600';
      case 'warning': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-12 bg-gray-200 rounded mb-4"></div>
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Access Alert */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          RBAC system is in active development. Current features include role and bundle management
          with metadata-driven surface bindings coming soon.
        </AlertDescription>
      </Alert>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Roles</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalRoles}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4">
              <Link href="/admin/security/rbac/roles">
                <Button variant="outline" size="sm" className="w-full">
                  Manage Roles
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Permission Bundles</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalBundles}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Key className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4">
              <Link href="/admin/security/rbac/bundles">
                <Button variant="outline" size="sm" className="w-full">
                  Manage Bundles
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Surface Bindings</p>
                <p className="text-3xl font-bold text-gray-900">{stats.surfaceBindings}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Lock className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4">
              <Link href="/admin/security/rbac/surfaces">
                <Button variant="outline" size="sm" className="w-full">
                  Manage Surfaces
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Recent Changes</p>
                <p className="text-3xl font-bold text-gray-900">{stats.recentChanges}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Activity className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-4">
              <Link href="/admin/security/rbac/audit">
                <Button variant="outline" size="sm" className="w-full">
                  View Audit Log
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Content */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="phases">Implementation Phases</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="quick-actions">Quick Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Role Registry</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Active
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Permission Bundles</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Active
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Surface Bindings</span>
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    Development
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Audit Logging</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Active
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Usage Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>System Roles</span>
                    <span>{Math.floor(stats.totalRoles * 0.3)} of {stats.totalRoles}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{width: '30%'}}></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Custom Bundles</span>
                    <span>{Math.floor(stats.totalBundles * 0.7)} of {stats.totalBundles}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{width: '70%'}}></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Active Bindings</span>
                    <span>{stats.surfaceBindings} configured</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-600 h-2 rounded-full" style={{width: '60%'}}></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="phases" className="space-y-4">
          {phaseStatuses.map((phase) => (
            <Card key={phase.phase}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${getPhaseStatusColor(phase.status)}`}>
                      {getPhaseStatusIcon(phase.status)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{phase.phase}: {phase.title}</h3>
                      <p className="text-sm text-gray-600">{phase.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getPhaseStatusColor(phase.status)}>
                      {phase.status.replace('_', ' ')}
                    </Badge>
                    {phase.route && phase.status !== 'planned' && (
                      <Link href={phase.route}>
                        <Button size="sm" variant="outline">
                          Access
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent RBAC Changes</CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between py-3 border-b last:border-b-0">
                      <div className="flex items-center gap-3">
                        <div className={`p-1 rounded-full ${getActivityStatusColor(activity.status)}`}>
                          <Activity className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {activity.action} on {activity.resource}
                          </p>
                          <p className="text-xs text-gray-500">
                            by {activity.user}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No recent activity to display
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quick-actions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <Link href="/admin/security/rbac/roles">
                <CardContent className="p-6 text-center">
                  <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <h3 className="font-semibold mb-1">Create Role</h3>
                  <p className="text-xs text-gray-600">Add new role with custom permissions</p>
                </CardContent>
              </Link>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <Link href="/admin/security/rbac/bundles">
                <CardContent className="p-6 text-center">
                  <Key className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <h3 className="font-semibold mb-1">Compose Bundle</h3>
                  <p className="text-xs text-gray-600">Create reusable permission sets</p>
                </CardContent>
              </Link>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow opacity-60">
              <CardContent className="p-6 text-center">
                <Lock className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <h3 className="font-semibold mb-1">Bind Surfaces</h3>
                <p className="text-xs text-gray-600">Link roles to UI elements</p>
                <Badge className="mt-2 bg-yellow-100 text-yellow-800">Coming Soon</Badge>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <Link href="/admin/security/rbac/audit">
                <CardContent className="p-6 text-center">
                  <Activity className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                  <h3 className="font-semibold mb-1">View Audit Trail</h3>
                  <p className="text-xs text-gray-600">Review system changes</p>
                </CardContent>
              </Link>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow opacity-60">
              <CardContent className="p-6 text-center">
                <UserCheck className="h-8 w-8 mx-auto mb-2 text-indigo-600" />
                <h3 className="font-semibold mb-1">Delegate Access</h3>
                <p className="text-xs text-gray-600">Campus & ministry controls</p>
                <Badge className="mt-2 bg-yellow-100 text-yellow-800">Planned</Badge>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <Settings className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                <h3 className="font-semibold mb-1">System Settings</h3>
                <p className="text-xs text-gray-600">Configure RBAC behavior</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}