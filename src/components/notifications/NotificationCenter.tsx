'use client';

import { useState, useEffect, useCallback } from 'react';
import { Check, CheckCheck, Loader2, Bell, ExternalLink, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { Notification, NotificationListResponse } from '@/models/notification/notification.model';

interface NotificationCenterProps {
  onNotificationRead?: () => void;
  onAllRead?: () => void;
  onClose?: () => void;
}

export function NotificationCenter({
  onNotificationRead,
  onAllRead,
  onClose,
}: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications?limit=20');
      if (response.ok) {
        const data: NotificationListResponse = await response.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unread_count);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        onNotificationRead?.();
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;

    setIsMarkingAllRead(true);
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      });

      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
        onAllRead?.();
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const notification = notifications.find((n) => n.id === id);
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        if (notification && !notification.is_read) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
          onNotificationRead?.();
        }
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleAction = (notification: Notification) => {
    if (notification.action_type === 'redirect' && notification.action_payload) {
      if (!notification.is_read) {
        handleMarkAsRead(notification.id);
      }
      window.location.href = notification.action_payload;
      onClose?.();
    }
  };

  const formatTimestamp = (timestamp: string | undefined) => {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getTypeColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <div className="flex flex-col" data-testid="notification-center">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="font-semibold">Notifications</h3>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAllRead}
            className="h-8 text-xs"
            data-testid="mark-all-read"
          >
            {isMarkingAllRead ? (
              <Loader2 className="mr-1 size-3 animate-spin" />
            ) : (
              <CheckCheck className="mr-1 size-3" />
            )}
            Mark all read
          </Button>
        )}
      </div>

      <Separator />

      {/* Notification List */}
      <ScrollArea className="h-[400px]" data-testid="notification-list">
        {isLoading ? (
          <div className="flex items-center justify-center py-12" data-testid="notification-loading">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground" data-testid="notification-empty">
            <Bell className="mb-2 size-10 opacity-50" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                data-testid="notification-item"
                className={cn(
                  'group relative flex gap-3 px-4 py-3 transition-colors hover:bg-muted/50',
                  !notification.is_read && 'bg-muted/30'
                )}
              >
                {/* Unread indicator */}
                <div className="flex flex-col items-center pt-1">
                  <div
                    data-testid={!notification.is_read ? 'unread-indicator' : undefined}
                    className={cn(
                      'size-2 rounded-full',
                      notification.is_read ? 'bg-transparent' : getTypeColor(notification.type)
                    )}
                  />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      data-testid="notification-title"
                      className={cn(
                        'text-sm line-clamp-1',
                        !notification.is_read && 'font-medium'
                      )}
                    >
                      {notification.title}
                    </p>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatTimestamp(notification.created_at)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2" data-testid="notification-message">
                    {notification.message}
                  </p>

                  {/* Actions */}
                  <div className="mt-2 flex items-center gap-2">
                    {notification.action_type === 'redirect' && notification.action_payload && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAction(notification)}
                        className="h-6 text-xs"
                        data-testid="notification-action"
                      >
                        <ExternalLink className="mr-1 size-3" />
                        View
                      </Button>
                    )}
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="h-6 text-xs opacity-0 group-hover:opacity-100"
                        data-testid="mark-read"
                      >
                        <Check className="mr-1 size-3" />
                        Mark read
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(notification.id)}
                      className="h-6 text-xs text-destructive opacity-0 hover:text-destructive group-hover:opacity-100"
                      data-testid="delete-notification"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
