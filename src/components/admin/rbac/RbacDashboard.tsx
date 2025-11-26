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
  TrendingUp,
  Clock,
  CheckCircle,
  HelpCircle,
  BookOpen,
  Play
} from 'lucide-react';
import { RbacHelpGuide } from './RbacHelpGuide';
import { ContextualHelp, QuickTip, HelpDialog, ProcessGuides, ProcessGuide } from './RbacHelper';
import { RbacOnboarding, useRbacOnboarding } from './RbacOnboarding';
import { UserManagement } from './UserManagement';
import { RoleCreationWizard } from './RoleCreationWizard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Link from 'next/link';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DashboardStats {
  totalRoles: number;
  totalUsers: number;
  activeUsers: number;
  systemRoles: number;
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

export function RbacDashboard() {
  const { showOnboarding, setShowOnboarding, completeOnboarding } = useRbacOnboarding();
  const [showWizard, setShowWizard] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalRoles: 0,
    totalUsers: 0,
    activeUsers: 0,
    systemRoles: 0,
    recentChanges: 0,
    pendingApprovals: 0
  });

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load dashboard statistics and audit data
      const [statisticsRes, auditRes] = await Promise.all([
        fetch('/api/rbac/statistics'),
        fetch('/api/rbac/audit?limit=10')
      ]);

      const [statistics, audit] = await Promise.all([
        statisticsRes.json(),
        auditRes.json()
      ]);

      if (statistics.success) {
        setStats(statistics.data);
      }

      // Transform audit data to recent activity
      if (audit.success) {
        const activities: RecentActivity[] = audit.data.slice(0, 5).map((log: any) => ({
          id: log.id,
          action: log.action.replace(/_/g, ' ').toLowerCase(),
          resource: log.resource_type || 'unknown',
          user: log.user_id || 'system',
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
      {/* Header with Help */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">RBAC Management</h1>
          <p className="text-gray-600 mt-1">
            Role-Based Access Control for your church management system
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <BookOpen className="h-4 w-4 mr-2" />
                Help Guide
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto" widthMode="content">
              <DialogHeader>
                <DialogTitle>RBAC Help Guide</DialogTitle>
              </DialogHeader>
              <RbacHelpGuide />
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            onClick={() => setShowOnboarding(true)}
          >
            <Play className="h-4 w-4 mr-2" />
            Start Tour
          </Button>

          <HelpDialog
            title="Quick Start Guide"
            triggerText="Quick Start"
          >
            <QuickTip
              type="tip"
              title="New to RBAC?"
              description="Start by understanding Users, Roles, and Permissions. Think of roles as job descriptions and permissions as keys to different areas."
            />
            <ProcessGuide steps={ProcessGuides.addNewUser} />
          </HelpDialog>
        </div>
      </div>

      {/* Getting Started Tips */}
      <QuickTip
        type="info"
        title="Getting Started"
        description="RBAC controls who can access what in your church system. Start with the Overview tab to see your current setup, then explore each phase for detailed management."
      />

      {/* Quick Access Alert */}
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription>
          <span className="text-green-800">
            RBAC system is active! Manage user roles, permissions, and audit access across your organization.
          </span>
        </AlertDescription>
      </Alert>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <ContextualHelp section="roles">
                  <div className="flex items-center gap-2 cursor-help">
                    <p className="text-sm font-medium text-gray-600">Total Roles</p>
                    <HelpCircle className="h-3 w-3 text-gray-400" />
                  </div>
                </ContextualHelp>
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
                <ContextualHelp section="auditLogs">
                  <div className="flex items-center gap-2 cursor-help">
                    <p className="text-sm font-medium text-gray-600">Recent Changes</p>
                    <HelpCircle className="h-3 w-3 text-gray-400" />
                  </div>
                </ContextualHelp>
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
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="user-management">User Management</TabsTrigger>
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
                  <span className="text-sm text-gray-600">Permission System</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Active
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
                    <span>{stats.systemRoles} of {stats.totalRoles}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{width: `${stats.totalRoles > 0 ? (stats.systemRoles / stats.totalRoles * 100) : 0}%`}}></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Active Users</span>
                    <span>{stats.activeUsers} of {stats.totalUsers}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-600 h-2 rounded-full" style={{width: `${stats.totalUsers > 0 ? (stats.activeUsers / stats.totalUsers * 100) : 0}%`}}></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
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

        <TabsContent value="user-management" className="space-y-4">
          <UserManagement />
        </TabsContent>

        <TabsContent value="quick-actions" className="space-y-4">
          <QuickTip
            type="info"
            title="Quick Actions"
            description="Common tasks for RBAC management. Each action provides access to key management areas."
          />

          <h3 className="text-lg font-semibold text-gray-900">Core Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ContextualHelp section="createRole">
              <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setShowWizard(true)}
              >
                <CardContent className="p-6 text-center">
                  <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <h3 className="font-semibold mb-1">Create Role</h3>
                  <p className="text-xs text-gray-600">Add new role with custom permissions</p>
                </CardContent>
              </Card>
            </ContextualHelp>

            <ContextualHelp section="managePermissions">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <Link href="/admin/security/rbac/roles">
                  <CardContent className="p-6 text-center">
                    <Key className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                    <h3 className="font-semibold mb-1">Manage Permissions</h3>
                    <p className="text-xs text-gray-600">View and edit role permissions</p>
                  </CardContent>
                </Link>
              </Card>
            </ContextualHelp>

            <ContextualHelp section="viewAudit">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <Link href="/admin/security/rbac/audit">
                  <CardContent className="p-6 text-center">
                    <Activity className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                    <h3 className="font-semibold mb-1">Audit Logs</h3>
                    <p className="text-xs text-gray-600">Review system changes</p>
                  </CardContent>
                </Link>
              </Card>
            </ContextualHelp>

            <ContextualHelp section="exportData">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-6 text-center">
                  <Lock className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <h3 className="font-semibold mb-1">Export Data</h3>
                  <p className="text-xs text-gray-600">Download roles & permissions</p>
                </CardContent>
              </Card>
            </ContextualHelp>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mt-6">Advanced Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ContextualHelp section="multiRole">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <Link href="/admin/rbac/multi-role">
                  <CardContent className="p-6 text-center">
                    <UserCheck className="h-8 w-8 mx-auto mb-2 text-indigo-600" />
                    <h3 className="font-semibold mb-1">Multi-Role Assignment</h3>
                    <p className="text-xs text-gray-600">Assign multiple roles with conflict analysis</p>
                  </CardContent>
                </Link>
              </Card>
            </ContextualHelp>

            <ContextualHelp section="delegatedConsole">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <Link href="/admin/rbac/delegated-console">
                  <CardContent className="p-6 text-center">
                    <Settings className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                    <h3 className="font-semibold mb-1">Delegated Console</h3>
                    <p className="text-xs text-gray-600">Campus & ministry-scoped access</p>
                  </CardContent>
                </Link>
              </Card>
            </ContextualHelp>

            <ContextualHelp section="delegateAccess">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <Link href="/admin/rbac/delegate-access">
                  <CardContent className="p-6 text-center">
                    <Shield className="h-8 w-8 mx-auto mb-2 text-red-600" />
                    <h3 className="font-semibold mb-1">Delegate Access</h3>
                    <p className="text-xs text-gray-600">Campus & ministry controls</p>
                  </CardContent>
                </Link>
              </Card>
            </ContextualHelp>
          </div>
        </TabsContent>
      </Tabs>

      {/* Onboarding Flow */}
      <RbacOnboarding
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={completeOnboarding}
      />

      {/* Role Creation Wizard */}
      <RoleCreationWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onComplete={() => {
          setShowWizard(false);
          // Refresh stats after role creation
          fetchStats();
        }}
      />
    </div>
  );
}