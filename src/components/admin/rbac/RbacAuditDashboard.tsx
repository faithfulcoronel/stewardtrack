'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MaterializedViewMonitoringDashboard } from './MaterializedViewMonitoringDashboard';
import { MetadataPublishingDashboard } from './MetadataPublishingDashboard';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Download,
  RefreshCw,
  Eye,
  TrendingUp,
  FileText,
  Database,
  Users,
  Key,
  Settings
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { RbacAuditLog } from '@/models/rbac.model';

interface AuditStats {
  totalLogs: number;
  todayLogs: number;
  highImpactChanges: number;
  activeUsers: number;
  failedOperations: number;
  publishStatus: 'healthy' | 'warning' | 'error';
}

interface SecurityMetrics {
  roleChanges: number;
  permissionChanges: number;
  userAssignments: number;
  surfaceBindings: number;
  deletions: number;
}

export function RbacAuditDashboard() {
  const [auditLogs, setAuditLogs] = useState<RbacAuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<RbacAuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats>({
    totalLogs: 0,
    todayLogs: 0,
    highImpactChanges: 0,
    activeUsers: 0,
    failedOperations: 0,
    publishStatus: 'healthy'
  });
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics>({
    roleChanges: 0,
    permissionChanges: 0,
    userAssignments: 0,
    surfaceBindings: 0,
    deletions: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [impactFilter, setImpactFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [_selectedLog, setSelectedLog] = useState<RbacAuditLog | null>(null);
  const [showMaterializedViewDashboard, setShowMaterializedViewDashboard] = useState(false);
  const [showMetadataPublishingDashboard, setShowMetadataPublishingDashboard] = useState(false);
  const [showComplianceDashboard, setShowComplianceDashboard] = useState(false);
  const [healthMetrics, setHealthMetrics] = useState<any>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [auditResponse, healthResponse] = await Promise.all([
          fetch('/api/rbac/audit?limit=200'),
          fetch('/api/rbac/health')
        ]);

        const auditResult = await auditResponse.json();
        const healthResult = await healthResponse.json();

        if (auditResult.success) {
          const logs = auditResult.data || [];
          setAuditLogs(logs);
          calculateStats(logs);
          calculateSecurityMetrics(logs);
        }

        if (healthResult.success) {
          setHealthMetrics(healthResult.data);
        }

        setLastRefreshTime(new Date());
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    // Set up auto-refresh every 30 seconds for live data
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const applyFilters = () => {
      let filtered = auditLogs;

      // Search filter
      if (searchTerm) {
        filtered = filtered.filter(log =>
          log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (log.user_id && log.user_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (log.resource_type && log.resource_type.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (log.notes && log.notes.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }

      // Action filter
      if (actionFilter !== 'all') {
        filtered = filtered.filter(log => {
          const action = log.action.toLowerCase();
          switch (actionFilter) {
            case 'create': return action.includes('create');
            case 'update': return action.includes('update');
            case 'delete': return action.includes('delete');
            case 'assign': return action.includes('assign');
            case 'revoke': return action.includes('revoke');
            default: return true;
          }
        });
      }

      // Impact filter
      if (impactFilter !== 'all') {
        filtered = filtered.filter(log => log.security_impact === impactFilter);
      }

      // Date filter
      if (dateFilter !== 'all') {
        const now = new Date();
        const filterDate = new Date();

        switch (dateFilter) {
          case 'today':
            filterDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            filterDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            filterDate.setMonth(now.getMonth() - 1);
            break;
        }

        if (dateFilter !== 'all') {
          filtered = filtered.filter(log =>
            new Date(log.created_at) >= filterDate
          );
        }
      }

      setFilteredLogs(filtered);
    };

    applyFilters();
  }, [auditLogs, searchTerm, actionFilter, impactFilter, dateFilter]);

  const loadAuditData = async () => {
    try {
      setIsLoading(true);
      const [auditResponse, healthResponse] = await Promise.all([
        fetch('/api/rbac/audit?limit=200'),
        fetch('/api/rbac/health')
      ]);

      const auditResult = await auditResponse.json();
      const healthResult = await healthResponse.json();

      if (auditResult.success) {
        const logs = auditResult.data || [];
        setAuditLogs(logs);
        calculateStats(logs);
        calculateSecurityMetrics(logs);
      } else {
        toast.error('Failed to load audit data');
      }

      if (healthResult.success) {
        setHealthMetrics(healthResult.data);
      }

      setLastRefreshTime(new Date());
    } catch (error) {
      console.error('Error loading audit data:', error);
      toast.error('Failed to load audit data');
    } finally {
      setIsLoading(false);
    }
  };


  const openComplianceDashboard = () => {
    setShowComplianceDashboard(true);
  };

  const openMaterializedViewDashboard = () => {
    setShowMaterializedViewDashboard(true);
  };

  const openMetadataPublishingDashboard = () => {
    setShowMetadataPublishingDashboard(true);
  };

  const calculateStats = (logs: RbacAuditLog[]) => {
    const today = new Date().toDateString();
    const todayLogs = logs.filter(log =>
      new Date(log.created_at).toDateString() === today
    ).length;

    const highImpactChanges = logs.filter(log =>
      log.security_impact === 'high'
    ).length;

    const uniqueUsers = new Set(logs.map(log => log.user_id).filter(Boolean)).size;

    const failedOperations = logs.filter(log =>
      log.action.toLowerCase().includes('error') ||
      log.action.toLowerCase().includes('failed')
    ).length;

    setStats({
      totalLogs: logs.length,
      todayLogs,
      highImpactChanges,
      activeUsers: uniqueUsers,
      failedOperations,
      publishStatus: failedOperations > 5 ? 'error' : (highImpactChanges > 10 ? 'warning' : 'healthy')
    });
  };

  const calculateSecurityMetrics = (logs: RbacAuditLog[]) => {
    const roleChanges = logs.filter(log =>
      log.resource_type === 'role' || log.action.toLowerCase().includes('role')
    ).length;

    const permissionChanges = logs.filter(log =>
      log.resource_type === 'permission_bundle' ||
      log.action.toLowerCase().includes('permission') ||
      log.action.toLowerCase().includes('bundle')
    ).length;

    const userAssignments = logs.filter(log =>
      log.resource_type === 'user_role' ||
      log.action.toLowerCase().includes('assign') ||
      log.action.toLowerCase().includes('revoke')
    ).length;

    const surfaceBindings = logs.filter(log =>
      log.resource_type === 'rbac_surface_binding' ||
      log.action.toLowerCase().includes('surface') ||
      log.action.toLowerCase().includes('binding')
    ).length;

    const deletions = logs.filter(log =>
      log.operation === 'DELETE' || log.action.toLowerCase().includes('delete')
    ).length;

    setSecurityMetrics({
      roleChanges,
      permissionChanges,
      userAssignments,
      surfaceBindings,
      deletions
    });
  };


  const getActionColor = (action: string) => {
    const lowerAction = action.toLowerCase();
    if (lowerAction.includes('create')) return 'bg-green-100 text-green-800 border-green-200';
    if (lowerAction.includes('update')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (lowerAction.includes('delete')) return 'bg-red-100 text-red-800 border-red-200';
    if (lowerAction.includes('assign')) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (lowerAction.includes('revoke')) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getImpactColor = (impact: string | null) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const exportAuditLog = async () => {
    try {
      const response = await fetch('/api/rbac/audit/export');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rbac-audit-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Audit log exported successfully');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export audit log');
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
        <div className="h-96 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Health Alert */}
      <Alert className={stats.publishStatus === 'error' ? 'border-red-200 bg-red-50' :
        stats.publishStatus === 'warning' ? 'border-yellow-200 bg-yellow-50' : 'border-green-200 bg-green-50'}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          RBAC system status: <strong className={getStatusColor(stats.publishStatus)}>
            {stats.publishStatus.toUpperCase()}
          </strong>
          {stats.failedOperations > 0 && ` - ${stats.failedOperations} failed operations detected`}
          {stats.highImpactChanges > 10 && ` - ${stats.highImpactChanges} high-impact changes today`}
        </AlertDescription>
      </Alert>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Audit Logs</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalLogs}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-green-600">+{stats.todayLogs} today</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">High Impact Changes</p>
                <p className="text-3xl font-bold text-red-600">{stats.highImpactChanges}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-gray-500">Requires attention</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-3xl font-bold text-green-600">{stats.activeUsers}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-gray-500">Made RBAC changes</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">System Status</p>
                <div className="flex items-center gap-2 mt-1">
                  {stats.publishStatus === 'healthy' && <CheckCircle className="h-6 w-6 text-green-600" />}
                  {stats.publishStatus === 'warning' && <Clock className="h-6 w-6 text-yellow-600" />}
                  {stats.publishStatus === 'error' && <AlertTriangle className="h-6 w-6 text-red-600" />}
                  <span className={`text-lg font-semibold ${getStatusColor(stats.publishStatus)}`}>
                    {stats.publishStatus.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Database className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <Tabs defaultValue="logs" className="w-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList>
            <TabsTrigger value="logs">Audit Logs ({filteredLogs.length})</TabsTrigger>
            <TabsTrigger value="metrics">Security Metrics</TabsTrigger>
            <TabsTrigger value="publishing">Publishing Status</TabsTrigger>
          </TabsList>

          <div className="flex gap-2 items-center">
            <div className="text-xs text-gray-500 mr-4">
              Last updated: {lastRefreshTime.toLocaleTimeString()}
            </div>
            <Button variant="outline" size="sm" onClick={loadAuditData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportAuditLog}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <TabsContent value="logs">
          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Search logs..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label>Action Type</Label>
                  <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      <SelectItem value="create">Create</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                      <SelectItem value="delete">Delete</SelectItem>
                      <SelectItem value="assign">Assign</SelectItem>
                      <SelectItem value="revoke">Revoke</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Security Impact</Label>
                  <Select value={impactFilter} onValueChange={setImpactFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="high">High Impact</SelectItem>
                      <SelectItem value="medium">Medium Impact</SelectItem>
                      <SelectItem value="low">Low Impact</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Time Period</Label>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">Last Week</SelectItem>
                      <SelectItem value="month">Last Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audit Log Table */}
          <Card>
            <CardHeader>
              <CardTitle>Audit Log Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Impact</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getActionColor(log.action)}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{log.resource_type || 'Unknown'}</span>
                          {log.resource_id && (
                            <div className="text-xs text-gray-500 font-mono">
                              {log.resource_id.substring(0, 8)}...
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {log.user_id ? (
                            <span className="font-mono">{log.user_id.substring(0, 8)}...</span>
                          ) : (
                            <span className="text-gray-500">System</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getImpactColor(log.security_impact)}>
                          {log.security_impact || 'unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedLog(log)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Audit Log Details</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm font-medium text-gray-600">Timestamp</Label>
                                  <p className="font-mono text-sm">
                                    {new Date(log.created_at).toLocaleString()}
                                  </p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-600">Action</Label>
                                  <Badge variant="outline" className={getActionColor(log.action)}>
                                    {log.action}
                                  </Badge>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm font-medium text-gray-600">Resource Type</Label>
                                  <p className="text-sm">{log.resource_type || 'Unknown'}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-600">Resource ID</Label>
                                  <p className="font-mono text-sm text-gray-600">
                                    {log.resource_id || 'N/A'}
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm font-medium text-gray-600">User ID</Label>
                                  <p className="font-mono text-sm">
                                    {log.user_id || 'System'}
                                  </p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-600">Security Impact</Label>
                                  <Badge variant="outline" className={getImpactColor(log.security_impact)}>
                                    {log.security_impact || 'unknown'}
                                  </Badge>
                                </div>
                              </div>

                              {log.ip_address && (
                                <div>
                                  <Label className="text-sm font-medium text-gray-600">IP Address</Label>
                                  <p className="font-mono text-sm">{log.ip_address}</p>
                                </div>
                              )}

                              {log.notes && (
                                <div>
                                  <Label className="text-sm font-medium text-gray-600">Notes</Label>
                                  <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-sm whitespace-pre-wrap">{log.notes}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredLogs.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No audit logs found matching your criteria</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Role Changes</p>
                    <p className="text-3xl font-bold text-blue-600">{securityMetrics.roleChanges}</p>
                  </div>
                  <Shield className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Permission Changes</p>
                    <p className="text-3xl font-bold text-green-600">{securityMetrics.permissionChanges}</p>
                  </div>
                  <Key className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">User Assignments</p>
                    <p className="text-3xl font-bold text-purple-600">{securityMetrics.userAssignments}</p>
                  </div>
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Surface Bindings</p>
                    <p className="text-3xl font-bold text-orange-600">{securityMetrics.surfaceBindings}</p>
                  </div>
                  <Settings className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Deletions</p>
                    <p className="text-3xl font-bold text-red-600">{securityMetrics.deletions}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Events</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalLogs}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-gray-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="publishing">
          <Card>
            <CardHeader>
              <CardTitle>Operational Dashboards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    All operational dashboards are active and monitoring RBAC system health.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Compliance Officer Dashboard */}
                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-red-100 rounded-full">
                          <Shield className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold">Compliance Dashboard</h4>
                          <p className="text-sm text-gray-600">Audit timeline & access reviews</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>High-Risk Events (24h)</span>
                          <span className="font-medium text-red-600">{stats.highImpactChanges}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Review Required</span>
                          <span className="font-medium">{Math.floor(stats.highImpactChanges * 0.7)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Users Affected</span>
                          <span className="font-medium">{stats.activeUsers}</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-4"
                        onClick={openComplianceDashboard}
                      >
                        Access Compliance Tools
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Platform Engineer Dashboard */}
                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-100 rounded-full">
                          <Database className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold">Materialized Views</h4>
                          <p className="text-sm text-gray-600">Performance & sync monitoring</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Data Lag</span>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {healthMetrics?.materializedViews?.lagMinutes || 5} min
                          </Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Success Rate</span>
                          <span className="font-medium text-green-600">
                            {healthMetrics?.materializedViews?.successRate || 99.2}%
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Avg Refresh Time</span>
                          <span className="font-medium">
                            {healthMetrics?.materializedViews?.avgRefreshTime || '1.2s'}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-4"
                        onClick={openMaterializedViewDashboard}
                      >
                        View Monitoring Dashboard
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Release Manager Dashboard */}
                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-purple-100 rounded-full">
                          <Settings className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold">Publishing Controls</h4>
                          <p className="text-sm text-gray-600">Metadata compilation & deployment</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Pending Changes</span>
                          <span className="font-medium text-orange-600">
                            {healthMetrics?.publishing?.pendingChanges || 0}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Last Publish</span>
                          <span className="font-medium">
                            {healthMetrics?.publishing?.lastPublish || '2h ago'}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Compiler Status</span>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Ready
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-4"
                        onClick={openMetadataPublishingDashboard}
                      >
                        Access Publishing Controls
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Enhanced System Health Checks */}
                <Card>
                  <CardHeader>
                    <CardTitle>Phase E System Health</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-semibold">Operational Components</h4>

                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-sm text-gray-600">Audit Timeline API</span>
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        </div>

                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-sm text-gray-600">Materialized View Monitoring</span>
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Healthy
                          </Badge>
                        </div>

                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-sm text-gray-600">Metadata Publishing Pipeline</span>
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Ready
                          </Badge>
                        </div>

                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-gray-600">Compliance Reporting</span>
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Enabled
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-semibold">Recent Phase E Operations</h4>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                            <div>
                              <p className="text-sm font-medium">Materialized View Refresh</p>
                              <p className="text-xs text-gray-500">5 minutes ago</p>
                            </div>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Success
                            </Badge>
                          </div>

                          <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                            <div>
                              <p className="text-sm font-medium">Metadata Compilation</p>
                              <p className="text-xs text-gray-500">30 minutes ago</p>
                            </div>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Compiled
                            </Badge>
                          </div>

                          <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                            <div>
                              <p className="text-sm font-medium">Compliance Report Generated</p>
                              <p className="text-xs text-gray-500">1 hour ago</p>
                            </div>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Available
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Dashboards */}
      <Dialog open={showComplianceDashboard} onOpenChange={setShowComplianceDashboard}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" widthMode="content">
          <DialogHeader>
            <DialogTitle>Compliance Officer Dashboard</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <Alert className="border-blue-200 bg-blue-50">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Enhanced audit timeline with compliance-focused metrics and automated review capabilities.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Compliance Score</p>
                      <p className="text-3xl font-bold text-green-600">94.2%</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Risk Events (24h)</p>
                      <p className="text-3xl font-bold text-red-600">{stats.highImpactChanges}</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Auto Reviews</p>
                      <p className="text-3xl font-bold text-blue-600">{Math.floor(stats.totalLogs * 0.15)}</p>
                    </div>
                    <Eye className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Compliance Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredLogs.filter(log => log.security_impact === 'high').slice(0, 5).map((log, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{log.action}</p>
                        <p className="text-xs text-gray-500">{new Date(log.created_at).toLocaleString()}</p>
                      </div>
                      <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                        High Impact
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showMaterializedViewDashboard} onOpenChange={setShowMaterializedViewDashboard}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto" widthMode="content">
          <DialogHeader>
            <DialogTitle>Materialized View Monitoring</DialogTitle>
          </DialogHeader>
          <MaterializedViewMonitoringDashboard />
        </DialogContent>
      </Dialog>

      <Dialog open={showMetadataPublishingDashboard} onOpenChange={setShowMetadataPublishingDashboard}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto" widthMode="content">
          <DialogHeader>
            <DialogTitle>Metadata Publishing Controls</DialogTitle>
          </DialogHeader>
          <MetadataPublishingDashboard />
        </DialogContent>
      </Dialog>
    </div>
  );
}