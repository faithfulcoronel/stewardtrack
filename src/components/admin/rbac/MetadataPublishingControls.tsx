'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Plus,
  PlayCircle,
  PauseCircle,
  StopCircle,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock,
  Download,
  Upload,
  Eye,
  Settings,
  Database,
  Layers,
  Zap,
  FileText,
  Globe,
  Building,
  Users,
  Shield,
  Activity,
  TrendingUp,
  Info,
  AlertCircle,
  Calendar,
  Server
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface PublishingJob {
  id: string;
  type: 'metadata_compilation' | 'permission_sync' | 'surface_binding_update' | 'license_validation';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  metadata: {
    entity_count: number;
    processed_count: number;
    tenant_id?: string;
    scope?: string;
  };
}

interface PublishingStats {
  totalJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageCompletionTime: number;
  lastPublishedAt?: string;
  nextScheduledAt?: string;
}

interface MetadataCompilationResult {
  surfaces: number;
  bindings: number;
  roles: number;
  bundles: number;
  features: number;
  errors: string[];
  warnings: string[];
}

interface TenantPublishingStatus {
  tenant_id: string;
  tenant_name: string;
  last_published_at?: string;
  status: 'current' | 'stale' | 'error';
  pending_changes: number;
  metadata_version: string;
}

export function MetadataPublishingControls() {
  const [jobs, setJobs] = useState<PublishingJob[]>([]);
  const [stats, setStats] = useState<PublishingStats>({
    totalJobs: 0,
    runningJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    averageCompletionTime: 0
  });
  const [tenantStatuses, setTenantStatuses] = useState<TenantPublishingStatus[]>([]);
  const [compilationResult, setCompilationResult] = useState<MetadataCompilationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showJobDialog, setShowJobDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState<PublishingJob | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadData();

    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(loadData, 5000); // Refresh every 5 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadData = async () => {
    try {
      const [jobsRes, statsRes, tenantsRes] = await Promise.all([
        fetch('/api/rbac/publishing/jobs'),
        fetch('/api/rbac/publishing/stats'),
        fetch('/api/rbac/publishing/tenant-status')
      ]);

      const [jobsData, statsData, tenantsData] = await Promise.all([
        jobsRes.json(),
        statsRes.json(),
        tenantsRes.json()
      ]);

      if (jobsData.success) setJobs(jobsData.data);
      if (statsData.success) setStats(statsData.data);
      if (tenantsData.success) setTenantStatuses(tenantsData.data);
    } catch (error) {
      console.error('Error loading publishing data:', error);
      if (!isLoading) { // Only show error if not initial load
        toast.error('Failed to load publishing data');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const startMetadataCompilation = async () => {
    try {
      setIsPublishing(true);
      const response = await fetch('/api/rbac/publishing/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'all' })
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Metadata compilation started');
        loadData();
      } else {
        toast.error(result.error || 'Failed to start compilation');
      }
    } catch (error) {
      console.error('Error starting compilation:', error);
      toast.error('Failed to start metadata compilation');
    } finally {
      setIsPublishing(false);
    }
  };

  const syncPermissions = async () => {
    try {
      setIsPublishing(true);
      const response = await fetch('/api/rbac/publishing/sync-permissions', {
        method: 'POST'
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Permission sync started');
        loadData();
      } else {
        toast.error(result.error || 'Failed to start permission sync');
      }
    } catch (error) {
      console.error('Error syncing permissions:', error);
      toast.error('Failed to sync permissions');
    } finally {
      setIsPublishing(false);
    }
  };

  const validateLicenses = async () => {
    try {
      setIsPublishing(true);
      const response = await fetch('/api/rbac/publishing/validate-licenses', {
        method: 'POST'
      });

      const result = await response.json();
      if (result.success) {
        toast.success('License validation started');
        loadData();
      } else {
        toast.error(result.error || 'Failed to start license validation');
      }
    } catch (error) {
      console.error('Error validating licenses:', error);
      toast.error('Failed to validate licenses');
    } finally {
      setIsPublishing(false);
    }
  };

  const cancelJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/rbac/publishing/jobs/${jobId}/cancel`, {
        method: 'POST'
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Job cancelled');
        loadData();
      } else {
        toast.error(result.error || 'Failed to cancel job');
      }
    } catch (error) {
      console.error('Error cancelling job:', error);
      toast.error('Failed to cancel job');
    }
  };

  const getJobIcon = (type: string) => {
    switch (type) {
      case 'metadata_compilation': return <Database className="h-4 w-4" />;
      case 'permission_sync': return <RefreshCw className="h-4 w-4" />;
      case 'surface_binding_update': return <Layers className="h-4 w-4" />;
      case 'license_validation': return <Zap className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getJobTypeLabel = (type: string) => {
    switch (type) {
      case 'metadata_compilation': return 'Metadata Compilation';
      case 'permission_sync': return 'Permission Sync';
      case 'surface_binding_update': return 'Surface Binding Update';
      case 'license_validation': return 'License Validation';
      default: return type;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'running': return <PlayCircle className="h-4 w-4 text-blue-600" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'cancelled': return <StopCircle className="h-4 w-4 text-gray-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'running': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTenantStatusColor = (status: string) => {
    switch (status) {
      case 'current': return 'bg-green-100 text-green-800 border-green-200';
      case 'stale': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Metadata Publishing Controls
          </h1>
          <p className="text-gray-600">
            Monitor and control RBAC metadata compilation and distribution across tenants
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-50 border-green-200' : ''}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh
          </Button>
          <Button onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Now
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Jobs</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalJobs}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-green-600">{stats.runningJobs} running</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-3xl font-bold text-green-600">
                  {stats.totalJobs ? Math.round((stats.completedJobs / stats.totalJobs) * 100) : 0}%
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-gray-500">{stats.completedJobs}/{stats.totalJobs} completed</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Duration</p>
                <p className="text-3xl font-bold text-purple-600">
                  {formatDuration(stats.averageCompletionTime)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-gray-500">Per job completion</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Last Published</p>
                <p className="text-lg font-bold text-gray-900">
                  {stats.lastPublishedAt ?
                    new Date(stats.lastPublishedAt).toLocaleDateString() :
                    'Never'
                  }
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-gray-500">
                {stats.nextScheduledAt ?
                  `Next: ${new Date(stats.nextScheduledAt).toLocaleDateString()}` :
                  'No schedule'
                }
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status Alert */}
      {stats.failedJobs > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>System Alert:</strong> {stats.failedJobs} publishing jobs have failed.
            Review job details and retry failed operations.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs defaultValue="publish" className="w-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList>
            <TabsTrigger value="publish">Publishing Controls</TabsTrigger>
            <TabsTrigger value="jobs">Job Queue ({jobs.length})</TabsTrigger>
            <TabsTrigger value="tenants">Tenant Status ({tenantStatuses.length})</TabsTrigger>
            <TabsTrigger value="logs">System Logs</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="publish">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Publishing Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Publishing Operations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-medium">Metadata Compilation</h3>
                      <p className="text-sm text-gray-600">
                        Compile all RBAC metadata and surface bindings
                      </p>
                    </div>
                    <Button
                      onClick={startMetadataCompilation}
                      disabled={isPublishing || stats.runningJobs > 0}
                    >
                      <Database className="h-4 w-4 mr-2" />
                      Compile
                    </Button>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-medium">Permission Sync</h3>
                      <p className="text-sm text-gray-600">
                        Synchronize permission changes across all tenants
                      </p>
                    </div>
                    <Button
                      onClick={syncPermissions}
                      disabled={isPublishing || stats.runningJobs > 0}
                      variant="outline"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sync
                    </Button>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-medium">License Validation</h3>
                      <p className="text-sm text-gray-600">
                        Validate feature licenses and surface accessibility
                      </p>
                    </div>
                    <Button
                      onClick={validateLicenses}
                      disabled={isPublishing || stats.runningJobs > 0}
                      variant="outline"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Validate
                    </Button>
                  </div>
                </div>

                {(isPublishing || stats.runningJobs > 0) && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Publishing operation in progress. Please wait for completion before starting new jobs.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Current Jobs */}
            <Card>
              <CardHeader>
                <CardTitle>Active Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {jobs.filter(job => job.status === 'running').map(job => (
                    <div key={job.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getJobIcon(job.type)}
                          <span className="font-medium text-sm">
                            {getJobTypeLabel(job.type)}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => cancelJob(job.id)}
                        >
                          <StopCircle className="h-3 w-3" />
                        </Button>
                      </div>
                      <Progress value={job.progress} className="mb-2" />
                      <div className="text-xs text-gray-600">
                        {job.metadata.processed_count}/{job.metadata.entity_count} entities processed
                      </div>
                    </div>
                  ))}

                  {jobs.filter(job => job.status === 'running').length === 0 && (
                    <div className="text-center py-8">
                      <Server className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">No active publishing jobs</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="jobs">
          <Card>
            <CardHeader>
              <CardTitle>Job History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map(job => (
                    <TableRow key={job.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getJobIcon(job.type)}
                          <span className="text-sm">{getJobTypeLabel(job.type)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(job.status)}>
                          {getStatusIcon(job.status)}
                          <span className="ml-1">{job.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="w-20">
                          <Progress value={job.progress} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {job.started_at ? new Date(job.started_at).toLocaleString() : '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {job.started_at && job.completed_at ?
                            formatDuration(
                              Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 60000)
                            ) :
                            job.started_at ? 'Running...' : '-'
                          }
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedJob(job);
                            setShowJobDialog(true);
                          }}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {jobs.length === 0 && (
                <div className="text-center py-8">
                  <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No publishing jobs found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tenants">
          <Card>
            <CardHeader>
              <CardTitle>Tenant Publishing Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Published</TableHead>
                    <TableHead>Pending Changes</TableHead>
                    <TableHead>Metadata Version</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenantStatuses.map(tenant => (
                    <TableRow key={tenant.tenant_id}>
                      <TableCell>
                        <span className="font-medium">{tenant.tenant_name}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getTenantStatusColor(tenant.status)}>
                          {tenant.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {tenant.last_published_at ?
                            new Date(tenant.last_published_at).toLocaleString() :
                            'Never'
                          }
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={tenant.pending_changes > 0 ? 'default' : 'secondary'}>
                          {tenant.pending_changes} changes
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{tenant.metadata_version}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>System Logs</CardTitle>
            </CardHeader>
            <CardContent className="text-center py-16">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">System logs integration coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Job Details Dialog */}
      {selectedJob && (
        <Dialog open={showJobDialog} onOpenChange={setShowJobDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {getJobIcon(selectedJob.type)}
                {getJobTypeLabel(selectedJob.type)} Details
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Status</Label>
                  <Badge variant="outline" className={getStatusColor(selectedJob.status)}>
                    {getStatusIcon(selectedJob.status)}
                    <span className="ml-1">{selectedJob.status}</span>
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Progress</Label>
                  <div className="flex items-center gap-2">
                    <Progress value={selectedJob.progress} className="flex-1" />
                    <span className="text-sm">{selectedJob.progress}%</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Started</Label>
                  <p className="text-sm">
                    {selectedJob.started_at ?
                      new Date(selectedJob.started_at).toLocaleString() :
                      'Not started'
                    }
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Completed</Label>
                  <p className="text-sm">
                    {selectedJob.completed_at ?
                      new Date(selectedJob.completed_at).toLocaleString() :
                      'In progress'
                    }
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-600">Processing Stats</Label>
                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm">
                    <p>Entities: {selectedJob.metadata.processed_count}/{selectedJob.metadata.entity_count}</p>
                    {selectedJob.metadata.tenant_id && (
                      <p>Tenant: {selectedJob.metadata.tenant_id}</p>
                    )}
                    {selectedJob.metadata.scope && (
                      <p>Scope: {selectedJob.metadata.scope}</p>
                    )}
                  </div>
                </div>
              </div>

              {selectedJob.error_message && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Error Message</Label>
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">{selectedJob.error_message}</p>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
