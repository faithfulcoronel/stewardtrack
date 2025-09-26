'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  CheckCircle,
  AlertTriangle,
  Clock,
  Zap,
  Code,
  PlayCircle,
  Package,
  FileCheck,
  GitBranch,
  Settings,
  Download
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface PublishingStatus {
  systemStatus: 'healthy' | 'warning' | 'error';
  lastPublish: string | null;
  pendingChanges: number;
  publishingQueue: Array<{
    action: string;
    timestamp: string;
    status: string;
    notes: string;
  }>;
  publishingHistory: Array<{
    action: string;
    timestamp: string;
    status: string;
    duration: number | null;
    notes: string;
    details?: any;
  }>;
  compilerStatus: {
    available: boolean;
    version: string;
    lastHealthCheck: string;
  };
}

export function MetadataPublishingDashboard() {
  const [publishingStatus, setPublishingStatus] = useState<PublishingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [metadataInput, setMetadataInput] = useState('');
  const [validationResult, setValidationResult] = useState<any>(null);

  useEffect(() => {
    loadPublishingStatus();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadPublishingStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadPublishingStatus = async () => {
    try {
      const response = await fetch('/api/rbac/metadata/publishing');
      const result = await response.json();

      if (result.success) {
        setPublishingStatus(result.data);
      } else {
        toast.error('Failed to load publishing status');
      }
    } catch (error) {
      console.error('Error loading publishing status:', error);
      toast.error('Failed to load publishing status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMetadataAction = async (action: string) => {
    setIsProcessing(true);
    try {
      const metadata = metadataInput ? JSON.parse(metadataInput) : {};
      const response = await fetch('/api/rbac/metadata/publishing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, metadata }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Metadata ${action} completed successfully`);
        if (action === 'validate') {
          setValidationResult(result.data);
        }
        // Reload status after action
        setTimeout(loadPublishingStatus, 1000);
      } else {
        toast.error(`Failed to ${action} metadata`);
      }
    } catch (error) {
      console.error(`Error during ${action}:`, error);
      toast.error(`Failed to ${action} metadata`);
    } finally {
      setIsProcessing(false);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'error': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default: return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const formatTimeAgo = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const minutes = Math.floor((Date.now() - new Date(timestamp).getTime()) / (1000 * 60));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ${minutes % 60}m ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h ago`;
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
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

  if (!publishingStatus) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load metadata publishing status. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Metadata Publishing Dashboard</h2>
          <p className="text-gray-600">
            Release manager controls for metadata compilation and deployment coordination
          </p>
        </div>
      </div>

      {/* System Status Alert */}
      <Alert className={
        publishingStatus.systemStatus === 'error' ? 'border-red-200 bg-red-50' :
        publishingStatus.systemStatus === 'warning' ? 'border-yellow-200 bg-yellow-50' :
        'border-green-200 bg-green-50'
      }>
        {getStatusIcon(publishingStatus.systemStatus)}
        <AlertDescription>
          <span className="font-medium">Publishing System Status: </span>
          <span className={`font-semibold ${getStatusColor(publishingStatus.systemStatus)}`}>
            {publishingStatus.systemStatus.toUpperCase()}
          </span>
          {publishingStatus.pendingChanges > 0 && (
            <span className="ml-2">
              • {publishingStatus.pendingChanges} pending changes in queue
            </span>
          )}
        </AlertDescription>
      </Alert>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">System Status</p>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusIcon(publishingStatus.systemStatus)}
                  <span className={`font-semibold ${getStatusColor(publishingStatus.systemStatus)}`}>
                    {publishingStatus.systemStatus.charAt(0).toUpperCase() + publishingStatus.systemStatus.slice(1)}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Settings className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Changes</p>
                <p className="text-3xl font-bold text-orange-600">
                  {publishingStatus.pendingChanges}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Package className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Last Publish</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatTimeAgo(publishingStatus.lastPublish)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Upload className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Compiler</p>
                <div className="flex items-center gap-2 mt-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">v{publishingStatus.compilerStatus.version}</span>
                </div>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Code className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <Tabs defaultValue="operations" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="queue">Publishing Queue</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="compiler">Compiler Status</TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Metadata Operations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="metadata-input">Metadata Configuration (JSON)</Label>
                <Textarea
                  id="metadata-input"
                  placeholder='{"keys": ["admin-security/rbac-dashboard"], "surfaces": [...]}'
                  value={metadataInput}
                  onChange={(e) => setMetadataInput(e.target.value)}
                  className="mt-2 h-32"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  onClick={() => handleMetadataAction('validate')}
                  disabled={isProcessing}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <FileCheck className="h-4 w-4" />
                  Validate Metadata
                </Button>

                <Button
                  onClick={() => handleMetadataAction('compile')}
                  disabled={isProcessing}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Code className="h-4 w-4" />
                  Compile Metadata
                </Button>

                <Button
                  onClick={() => handleMetadataAction('publish')}
                  disabled={isProcessing || publishingStatus.pendingChanges === 0}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  <PlayCircle className="h-4 w-4" />
                  {isProcessing ? 'Publishing...' : 'Publish Changes'}
                </Button>
              </div>

              {/* Validation Results */}
              {validationResult && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileCheck className="h-5 w-5" />
                      Validation Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        {validationResult.isValid ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        )}
                        <span className={`font-medium ${
                          validationResult.isValid ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {validationResult.isValid ? 'Validation Passed' : 'Validation Failed'}
                        </span>
                      </div>

                      {validationResult.errors?.length > 0 && (
                        <div>
                          <h4 className="font-medium text-red-600 mb-2">Errors:</h4>
                          <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                            {validationResult.errors.map((error: string, index: number) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {validationResult.warnings?.length > 0 && (
                        <div>
                          <h4 className="font-medium text-yellow-600 mb-2">Warnings:</h4>
                          <ul className="list-disc list-inside text-sm text-yellow-600 space-y-1">
                            {validationResult.warnings.map((warning: string, index: number) => (
                              <li key={index}>{warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Publishing Queue ({publishingStatus.pendingChanges} items)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {publishingStatus.publishingQueue.length > 0 ? (
                <div className="space-y-3">
                  {publishingStatus.publishingQueue.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-1 rounded-full bg-blue-100">
                          <GitBranch className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {item.action.replace(/_/g, ' ').toLowerCase()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(item.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {item.status}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          {item.notes}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">No pending changes in queue</p>
                  <p className="text-sm text-gray-400">All metadata is up to date</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Publishing History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {publishingStatus.publishingHistory.length > 0 ? (
                <div className="space-y-3">
                  {publishingStatus.publishingHistory.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`p-1 rounded-full ${
                          item.status === 'success' ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {item.status === 'success' ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {item.action.replace(/_/g, ' ').toLowerCase()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(item.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className={
                          item.status === 'success' ?
                          'bg-green-50 text-green-700 border-green-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        }>
                          {item.status}
                        </Badge>
                        {item.duration && (
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDuration(item.duration)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">No publishing history available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compiler" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Compiler Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">System Information</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Status</span>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {publishingStatus.compilerStatus.available ? 'Available' : 'Unavailable'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Version</span>
                      <span className="font-medium">{publishingStatus.compilerStatus.version}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Last Health Check</span>
                      <span className="text-sm">
                        {formatTimeAgo(publishingStatus.compilerStatus.lastHealthCheck)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Capabilities</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Metadata Validation</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Surface Compilation</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Deployment Integration</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}