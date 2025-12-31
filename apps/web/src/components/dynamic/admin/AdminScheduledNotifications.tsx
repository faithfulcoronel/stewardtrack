'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Calendar,
  Loader2,
  Trash2,
  RefreshCw,
  Mail,
  MessageSquare,
  Bell,
  Webhook,
  Smartphone,
  Crown,
  CalendarClock,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export interface AdminScheduledNotificationsProps {
  title?: string;
  description?: string;
  maxItems?: number;
}

interface ScheduledItem {
  id: string;
  event_type: string;
  channel: 'in_app' | 'email' | 'sms' | 'push' | 'webhook';
  scheduled_for: string;
  status: string;
  payload: Record<string, unknown>;
  created_at: string;
  recipient_id: string;
}

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  in_app: Bell,
  email: Mail,
  sms: MessageSquare,
  push: Smartphone,
  webhook: Webhook,
};

const CHANNEL_COLORS: Record<string, string> = {
  in_app: 'text-blue-600 bg-blue-500/10',
  email: 'text-emerald-600 bg-emerald-500/10',
  sms: 'text-purple-600 bg-purple-500/10',
  push: 'text-orange-600 bg-orange-500/10',
  webhook: 'text-amber-600 bg-amber-500/10',
};

const CHANNEL_LABELS: Record<string, string> = {
  in_app: 'In-App',
  email: 'Email',
  sms: 'SMS',
  push: 'Push',
  webhook: 'Webhook',
};

function formatEventType(eventType: string): string {
  return eventType
    .split('.')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' > ');
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 0) return 'Past due';
  if (diffMins < 60) return `In ${diffMins} min${diffMins !== 1 ? 's' : ''}`;
  if (diffHours < 24) return `In ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
  if (diffDays < 7) return `In ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  return date.toLocaleDateString();
}

export function AdminScheduledNotifications({
  title = 'Scheduled Notifications',
  description = 'View and manage notifications scheduled for future delivery',
  maxItems = 20,
}: AdminScheduledNotificationsProps) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ScheduledItem[]>([]);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ScheduledItem | null>(null);

  const { toast } = useToast();

  const fetchScheduledItems = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications/scheduled');
      if (!response.ok) throw new Error('Failed to fetch scheduled notifications');
      const data = await response.json();
      setItems((data.data || []).slice(0, maxItems));
    } catch (error) {
      console.error('Error fetching scheduled notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load scheduled notifications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [maxItems, toast]);

  useEffect(() => {
    fetchScheduledItems();
  }, [fetchScheduledItems]);

  const handleCancelClick = (item: ScheduledItem) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!itemToDelete) return;

    setCancellingId(itemToDelete.id);
    try {
      const response = await fetch(`/api/notifications/scheduled/${itemToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel notification');
      }

      setItems((prev) => prev.filter((item) => item.id !== itemToDelete.id));
      toast({
        title: 'Notification Cancelled',
        description: 'The scheduled notification has been cancelled',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to cancel notification',
        variant: 'destructive',
      });
    } finally {
      setCancellingId(null);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header - Mobile optimized */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{title}</h2>
            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
              <Crown className="h-3 w-3 mr-1" />
              Enterprise
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchScheduledItems}
          disabled={loading}
          className="w-full sm:w-auto"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Empty State */}
      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-3 rounded-full bg-muted mb-4">
              <CalendarClock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">No Scheduled Notifications</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Scheduled notifications will appear here. You can schedule notifications to be sent at specific times.
            </p>
          </CardContent>
        </Card>
      ) : (
        /* Notification List - Mobile-first card layout */
        <div className="space-y-3">
          {items.map((item) => {
            const ChannelIcon = CHANNEL_ICONS[item.channel] || Bell;
            const channelColor = CHANNEL_COLORS[item.channel] || 'text-gray-600 bg-gray-500/10';
            const scheduledDate = new Date(item.scheduled_for);

            return (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Mobile: Stack layout */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
                    {/* Channel Icon */}
                    <div className={`p-2.5 rounded-lg ${channelColor} shrink-0 self-start sm:self-center`}>
                      <ChannelIcon className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Event Type & Channel Badge */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {formatEventType(item.event_type)}
                        </span>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {CHANNEL_LABELS[item.channel] || item.channel}
                        </Badge>
                      </div>

                      {/* Schedule Time - Prominent on mobile */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{scheduledDate.toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20"
                        >
                          {formatRelativeTime(item.scheduled_for)}
                        </Badge>
                      </div>

                      {/* Payload preview (if available) */}
                      {item.payload?.title && (
                        <p className="text-xs text-muted-foreground truncate">
                          {String(item.payload.title)}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 mt-2 sm:mt-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelClick(item)}
                        disabled={cancellingId === item.id}
                        className="flex-1 sm:flex-none text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        {cancellingId === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-2 sm:mr-0" />
                            <span className="sm:hidden">Cancel</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Summary Stats - Mobile grid */}
      {items.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="py-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{items.length}</div>
                <div className="text-xs text-muted-foreground">Scheduled</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {items.filter((i) => i.channel === 'email').length}
                </div>
                <div className="text-xs text-muted-foreground">Email</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {items.filter((i) => i.channel === 'sms').length}
                </div>
                <div className="text-xs text-muted-foreground">SMS</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {items.filter((i) => {
                    const date = new Date(i.scheduled_for);
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    return date < tomorrow;
                  }).length}
                </div>
                <div className="text-xs text-muted-foreground">Due Today</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Scheduled Notification?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently cancel the scheduled notification. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel className="w-full sm:w-auto">Keep It</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancel Notification
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
