'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Database,
  RefreshCw,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  Play,
  Activity,
  BarChart3,
  Timer
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface MaterializedViewStatus {
  currentStatus: 'healthy' | 'warning' | 'error';
  lastRefresh: string | null;
  lagMinutes: number | null;
  refreshHistory: Array<{
    timestamp: string;
    duration: number | null;
    status: 'success' | 'failed';
    notes: string;
  }>;
  viewFreshness: string | null;
  performanceMetrics: {
    averageRefreshTime: number;
    successRate: number;
  };
}

export function MaterializedViewMonitoringDashboard() {
  const [viewStatus, setViewStatus] = useState<MaterializedViewStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadViewStatus();
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(loadViewStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadViewStatus = async () => {
    try {
      const response = await fetch('/api/rbac/materialized-views');
      const result = await response.json();

      if (result.success) {
        setViewStatus(result.data);
      } else {
        toast.error('Failed to load materialized view status');
      }
    } catch (error) {
      console.error('Error loading materialized view status:', error);
      toast.error('Failed to load materialized view status');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshViews = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/rbac/materialized-views', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'refresh' }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Materialized views refresh initiated');
        // Reload status after a delay
        setTimeout(loadViewStatus, 2000);
      } else {
        toast.error('Failed to refresh materialized views');
      }
    } catch (error) {
      console.error('Error refreshing materialized views:', error);
      toast.error('Failed to refresh materialized views');
    } finally {
      setIsRefreshing(false);
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

  const formatDuration = (ms: number | null) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
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

  if (!viewStatus) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load materialized view monitoring data. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Materialized View Monitoring</h2>
          <p className="text-gray-600">
            Platform engineer dashboard for monitoring RBAC materialized view performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadViewStatus} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Status
          </Button>
          <Button
            onClick={refreshViews}
            disabled={isRefreshing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Play className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Views'}
          </Button>
        </div>
      </div>

      {/* System Status Alert */}
      <Alert className={
        viewStatus.currentStatus === 'error' ? 'border-red-200 bg-red-50' :
        viewStatus.currentStatus === 'warning' ? 'border-yellow-200 bg-yellow-50' :
        'border-green-200 bg-green-50'
      }>
        {getStatusIcon(viewStatus.currentStatus)}
        <AlertDescription>
          <span className="font-medium">Materialized View Status: </span>
          <span className={`font-semibold ${getStatusColor(viewStatus.currentStatus)}`}>
            {viewStatus.currentStatus.toUpperCase()}
          </span>
          {viewStatus.lagMinutes !== null && (
            <span className="ml-2">
              • Data lag: {viewStatus.lagMinutes} minutes
            </span>
          )}
        </AlertDescription>
      </Alert>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Current Status</p>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusIcon(viewStatus.currentStatus)}
                  <span className={`font-semibold ${getStatusColor(viewStatus.currentStatus)}`}>
                    {viewStatus.currentStatus.charAt(0).toUpperCase() + viewStatus.currentStatus.slice(1)}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Database className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-xs text-gray-500">
                Last updated: {formatTimeAgo(viewStatus.viewFreshness)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Data Lag</p>
                <p className="text-3xl font-bold text-gray-900">
                  {viewStatus.lagMinutes || 0}
                </p>
                <p className="text-xs text-gray-500">minutes</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Timer className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-2">
              <Progress
                value={Math.max(0, 100 - (viewStatus.lagMinutes || 0) * 2)}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-3xl font-bold text-green-600">
                  {viewStatus.performanceMetrics.successRate.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-2">
              <Progress
                value={viewStatus.performanceMetrics.successRate}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Refresh Time</p>
                <p className="text-3xl font-bold text-blue-600">
                  {formatDuration(viewStatus.performanceMetrics.averageRefreshTime)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-xs text-gray-500">
                Last refresh: {formatTimeAgo(viewStatus.lastRefresh)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Refresh History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Refresh History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {viewStatus.refreshHistory.length > 0 ? (
            <div className="space-y-3">
              {viewStatus.refreshHistory.map((refresh, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-1 rounded-full ${
                      refresh.status === 'success' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {refresh.status === 'success' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {new Date(refresh.timestamp).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">{refresh.notes}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className={
                      refresh.status === 'success' ?
                      'bg-green-50 text-green-700 border-green-200' :
                      'bg-red-50 text-red-700 border-red-200'
                    }>
                      {refresh.status}
                    </Badge>
                    {refresh.duration && (
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDuration(refresh.duration)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Database className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No refresh history available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Refresh Performance</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Average Duration</span>
                  <span className="font-medium">
                    {formatDuration(viewStatus.performanceMetrics.averageRefreshTime)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Success Rate</span>
                  <span className="font-medium text-green-600">
                    {viewStatus.performanceMetrics.successRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Refreshes</span>
                  <span className="font-medium">{viewStatus.refreshHistory.length}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">System Health</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Data Freshness</span>
                  <Badge variant="outline" className={
                    (viewStatus.lagMinutes || 0) < 15 ?
                    'bg-green-50 text-green-700 border-green-200' :
                    'bg-yellow-50 text-yellow-700 border-yellow-200'
                  }>
                    {(viewStatus.lagMinutes || 0) < 15 ? 'Fresh' : 'Stale'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Auto Refresh</span>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    Enabled
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Monitoring</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Active
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}