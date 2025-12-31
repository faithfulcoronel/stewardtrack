'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Mail,
  MessageSquare,
  Bell,
  Webhook,
  Smartphone,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Crown,
  BarChart3,
  Send,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface AdminNotificationAnalyticsProps {
  title?: string;
  description?: string;
}

interface AnalyticsData {
  summary: {
    total: number;
    delivered: number;
    pending: number;
    failed: number;
    scheduled: number;
  };
  deliveryRate: number;
  channelBreakdown: {
    channel: string;
    total: number;
    delivered: number;
    failed: number;
    rate: number;
  }[];
  recentTrend: {
    date: string;
    delivered: number;
    failed: number;
  }[];
  topEventTypes: {
    eventType: string;
    count: number;
  }[];
}

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  in_app: Bell,
  email: Mail,
  sms: MessageSquare,
  push: Smartphone,
  webhook: Webhook,
};

const CHANNEL_COLORS: Record<string, string> = {
  in_app: 'text-blue-600',
  email: 'text-emerald-600',
  sms: 'text-purple-600',
  push: 'text-orange-600',
  webhook: 'text-amber-600',
};

const CHANNEL_LABELS: Record<string, string> = {
  in_app: 'In-App',
  email: 'Email',
  sms: 'SMS',
  push: 'Push',
  webhook: 'Webhook',
};

export function AdminNotificationAnalytics({
  title = 'Notification Analytics',
  description = 'Monitor delivery rates, channel performance, and notification trends',
}: AdminNotificationAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState('30');

  const { toast } = useToast();

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/notifications/analytics?days=${timeRange}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error('Error fetching notification analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notification analytics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [timeRange, toast]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertTriangle className="h-8 w-8 text-muted-foreground mb-4" />
          <h3 className="font-medium mb-1">Unable to Load Analytics</h3>
          <p className="text-sm text-muted-foreground mb-4">
            There was a problem loading the analytics data.
          </p>
          <Button onClick={fetchAnalytics} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { summary, deliveryRate, channelBreakdown, recentTrend } = data;

  return (
    <div className="space-y-4">
      {/* Header - Mobile optimized */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{title}</h2>
            <Badge variant="outline" className="text-xs bg-indigo-500/10 text-indigo-600 border-indigo-500/20">
              <Crown className="h-3 w-3 mr-1" />
              Premium
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchAnalytics}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Summary Cards - Mobile: 2 cols, Desktop: 4 cols */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Sent */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 shrink-0">
                <Send className="h-5 w-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Total Sent</p>
                <p className="text-xl font-bold">{summary.total.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivered */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 shrink-0">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Delivered</p>
                <p className="text-xl font-bold">{summary.delivered.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 shrink-0">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Pending</p>
                <p className="text-xl font-bold">{summary.pending.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Failed */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10 shrink-0">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Failed</p>
                <p className="text-xl font-bold">{summary.failed.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delivery Rate Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Delivery Rate
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-3xl font-bold">{deliveryRate}%</span>
            <div className="flex items-center gap-1 text-sm">
              {deliveryRate >= 95 ? (
                <>
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  <span className="text-emerald-600">Excellent</span>
                </>
              ) : deliveryRate >= 85 ? (
                <>
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span className="text-blue-600">Good</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-4 w-4 text-amber-600" />
                  <span className="text-amber-600">Needs Attention</span>
                </>
              )}
            </div>
          </div>
          <Progress value={deliveryRate} className="h-2" />
          <p className="text-xs text-muted-foreground">
            Based on {(summary.delivered + summary.failed).toLocaleString()} processed notifications
          </p>
        </CardContent>
      </Card>

      {/* Channel Performance - Mobile stack, Desktop grid */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Channel Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {channelBreakdown.map((channel) => {
              const ChannelIcon = CHANNEL_ICONS[channel.channel] || Bell;
              const iconColor = CHANNEL_COLORS[channel.channel] || 'text-gray-600';
              const label = CHANNEL_LABELS[channel.channel] || channel.channel;
              const rate = channel.total > 0
                ? Math.round((channel.delivered / channel.total) * 100)
                : 0;

              return (
                <div key={channel.channel} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ChannelIcon className={`h-4 w-4 ${iconColor}`} />
                      <span className="text-sm font-medium">{label}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        {channel.delivered}/{channel.total}
                      </span>
                      <Badge
                        variant="outline"
                        className={rate >= 90
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : rate >= 70
                            ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                            : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        }
                      >
                        {rate}%
                      </Badge>
                    </div>
                  </div>
                  <Progress value={rate} className="h-1.5" />
                </div>
              );
            })}

            {channelBreakdown.every(c => c.total === 0) && (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">No channel data available yet</p>
                <p className="text-xs mt-1">Send notifications to see channel performance</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Trend - Simple bar visualization */}
      {recentTrend.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTrend.map((day) => {
                const total = day.delivered + day.failed;
                const deliveredPct = total > 0 ? (day.delivered / total) * 100 : 0;

                return (
                  <div key={day.date} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {new Date(day.date).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-emerald-600">{day.delivered} sent</span>
                        {day.failed > 0 && (
                          <span className="text-red-600">{day.failed} failed</span>
                        )}
                      </div>
                    </div>
                    <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                      {total > 0 && (
                        <>
                          <div
                            className="bg-emerald-500 h-full"
                            style={{ width: `${deliveredPct}%` }}
                          />
                          <div
                            className="bg-red-400 h-full"
                            style={{ width: `${100 - deliveredPct}%` }}
                          />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              {recentTrend.every(d => d.delivered === 0 && d.failed === 0) && (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-sm">No activity in this period</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scheduled Notifications Summary */}
      {summary.scheduled > 0 && (
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">{summary.scheduled} Scheduled</p>
                <p className="text-sm text-muted-foreground">
                  Notifications waiting to be sent
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
