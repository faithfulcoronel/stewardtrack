/**
 * ================================================================================
 * USE NOTIFICATIONS HOOK
 * ================================================================================
 *
 * React hook for managing notifications with real-time updates via Supabase.
 *
 * Features:
 * - Real-time notification updates via Supabase Realtime
 * - Automatic unread count tracking
 * - Optimistic UI updates
 * - Automatic reconnection handling
 *
 * Usage:
 *   const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();
 *
 * ================================================================================
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Notification } from '@/models/notification/notification.model';

interface UseNotificationsOptions {
  /** Maximum number of notifications to fetch */
  limit?: number;
  /** Whether to enable real-time updates */
  realtime?: boolean;
  /** Polling interval in ms when realtime is unavailable (0 to disable) */
  pollingInterval?: number;
}

interface UseNotificationsResult {
  /** List of notifications */
  notifications: Notification[];
  /** Count of unread notifications */
  unreadCount: number;
  /** Whether notifications are being loaded */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Whether realtime connection is active */
  isRealtimeConnected: boolean;
  /** Mark a single notification as read */
  markAsRead: (id: string) => Promise<void>;
  /** Mark all notifications as read */
  markAllAsRead: () => Promise<void>;
  /** Delete a notification */
  deleteNotification: (id: string) => Promise<void>;
  /** Refresh notifications from server */
  refresh: () => Promise<void>;
}

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsResult {
  const { limit = 20, realtime = true, pollingInterval = 0 } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Create Supabase client
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  /**
   * Fetch notifications from API
   */
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch(`/api/notifications?limit=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Failed to fetch notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  /**
   * Mark a notification as read
   */
  const markAsRead = useCallback(async (id: string) => {
    try {
      // Optimistic update
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        // Revert on failure
        await fetchNotifications();
        throw new Error('Failed to mark notification as read');
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, [fetchNotifications]);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);

      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      });

      if (!response.ok) {
        // Revert on failure
        await fetchNotifications();
        throw new Error('Failed to mark all notifications as read');
      }
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  }, [fetchNotifications]);

  /**
   * Delete a notification
   */
  const deleteNotification = useCallback(async (id: string) => {
    try {
      const notification = notifications.find(n => n.id === id);

      // Optimistic update
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        // Revert on failure
        await fetchNotifications();
        throw new Error('Failed to delete notification');
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  }, [notifications, fetchNotifications]);

  /**
   * Setup realtime subscription
   */
  const setupRealtime = useCallback(async () => {
    if (!realtime) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Subscribe to notifications for this user
      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotification = payload.new as Notification;
            setNotifications(prev => [newNotification, ...prev].slice(0, limit));
            if (!newNotification.is_read) {
              setUnreadCount(prev => prev + 1);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const updated = payload.new as Notification;
            const old = payload.old as Notification;

            setNotifications(prev =>
              prev.map(n => (n.id === updated.id ? updated : n))
            );

            // Adjust unread count if read status changed
            if (!old.is_read && updated.is_read) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const deleted = payload.old as Notification;
            setNotifications(prev => prev.filter(n => n.id !== deleted.id));
            if (!deleted.is_read) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            }
          }
        )
        .subscribe((status) => {
          setIsRealtimeConnected(status === 'SUBSCRIBED');
        });

      channelRef.current = channel;
    } catch (err) {
      console.error('Failed to setup realtime subscription:', err);
      setIsRealtimeConnected(false);
    }
  }, [supabase, realtime, limit]);

  /**
   * Cleanup realtime subscription
   */
  const cleanupRealtime = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setIsRealtimeConnected(false);
  }, [supabase]);

  /**
   * Setup polling fallback
   */
  const setupPolling = useCallback(() => {
    if (pollingInterval <= 0 || isRealtimeConnected) return;

    pollingIntervalRef.current = setInterval(fetchNotifications, pollingInterval);
  }, [pollingInterval, isRealtimeConnected, fetchNotifications]);

  /**
   * Cleanup polling
   */
  const cleanupPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Initial fetch and realtime setup
  useEffect(() => {
    fetchNotifications();
    setupRealtime();

    return () => {
      cleanupRealtime();
      cleanupPolling();
    };
  }, [fetchNotifications, setupRealtime, cleanupRealtime, cleanupPolling]);

  // Setup polling if realtime is not connected
  useEffect(() => {
    if (!isRealtimeConnected && pollingInterval > 0) {
      setupPolling();
    } else {
      cleanupPolling();
    }

    return cleanupPolling;
  }, [isRealtimeConnected, pollingInterval, setupPolling, cleanupPolling]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    isRealtimeConnected,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: fetchNotifications,
  };
}
