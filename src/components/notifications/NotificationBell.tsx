'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { NotificationCenter } from './NotificationCenter';
import { cn } from '@/lib/utils';

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/unread-count');
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const handleNotificationRead = useCallback(() => {
    // Decrement count when a notification is read
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const handleAllRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          data-testid="notification-bell"
          className={cn(
            'relative flex-none rounded-full border border-border/60 text-muted-foreground',
            className
          )}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell className="size-4" />
          {!isLoading && unreadCount > 0 && (
            <span
              data-testid="notification-badge"
              className={cn(
                'absolute -right-1 -top-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-medium',
                unreadCount > 99 ? 'h-5 w-6 px-1' : 'size-4'
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[380px] p-0"
        sideOffset={8}
      >
        <NotificationCenter
          onNotificationRead={handleNotificationRead}
          onAllRead={handleAllRead}
          onClose={() => setIsOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
