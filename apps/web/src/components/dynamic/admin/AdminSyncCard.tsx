'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { RefreshCw, CheckCircle2, AlertCircle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AdminSyncCardProps {
  title?: string;
  description?: string;
  totalItems?: number;
  syncedItems?: number;
  unsyncedItems?: number;
  syncAvailable?: boolean;
  message?: string;
  syncActionHandler?: string;
  syncButtonLabel?: string;
  icon?: 'users' | 'refresh' | 'check' | 'alert';
}

export function AdminSyncCard(props: AdminSyncCardProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success?: boolean;
    message?: string;
    created?: number;
    failed?: number;
  } | null>(null);

  const {
    title = 'Data Sync',
    description = 'Synchronize data between systems.',
    totalItems = 0,
    syncedItems = 0,
    unsyncedItems = 0,
    syncAvailable = false,
    message = '',
    syncActionHandler = '',
    syncButtonLabel = 'Sync Now',
    icon = 'users',
  } = props;

  const syncPercentage = totalItems > 0 ? Math.round((syncedItems / totalItems) * 100) : 100;

  const handleSync = async () => {
    if (!syncActionHandler) {
      toast.error('No sync handler configured');
      return;
    }

    setIsSyncing(true);
    setSyncResult(null);

    try {
      const response = await fetch('/api/metadata/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: {
            id: syncActionHandler,
            kind: 'metadata.service',
            config: {
              handler: syncActionHandler,
            },
          },
          input: {},
          context: {
            params: {},
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        const data = result.data || {};
        toast.success(result.message || 'Sync completed successfully');
        setSyncResult({
          success: true,
          message: result.message,
          created: data.created,
          failed: data.failed,
        });
        // Refresh the page to update stats
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast.error(result.error || result.message || 'Sync failed');
        setSyncResult({
          success: false,
          message: result.error || result.message,
        });
      }
    } catch (error: any) {
      console.error('[AdminSyncCard] Sync error:', error);
      toast.error('Failed to execute sync');
      setSyncResult({
        success: false,
        message: error?.message || 'Unknown error occurred',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const IconComponent = {
    users: Users,
    refresh: RefreshCw,
    check: CheckCircle2,
    alert: AlertCircle,
  }[icon];

  return (
    <Card className={cn(
      "group relative overflow-hidden",
      "border-border/40 bg-card/50 backdrop-blur-sm",
      "transition-all duration-300",
      "hover:border-border hover:shadow-lg hover:shadow-primary/5"
    )}>
      {/* Top accent line - color based on sync status */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-0.5 transition-colors",
        syncAvailable ? "bg-amber-400" : "bg-emerald-400"
      )} />

      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <CardHeader className="relative space-y-3 pb-3 sm:pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl',
              'transition-all duration-200',
              syncAvailable
                ? 'bg-gradient-to-br from-amber-500/20 to-amber-500/10 shadow-amber-500/10 shadow-inner'
                : 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 shadow-emerald-500/10 shadow-inner'
            )}>
              <IconComponent className={cn(
                'h-5 w-5 sm:h-6 sm:w-6',
                syncAvailable ? 'text-amber-600' : 'text-emerald-600'
              )} />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm sm:text-base font-semibold truncate">{title}</CardTitle>
              <CardDescription className="text-xs sm:text-sm line-clamp-2">{description}</CardDescription>
            </div>
          </div>
          {syncAvailable ? (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/40 font-medium shrink-0 self-start sm:self-auto">
              Action Required
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/40 font-medium shrink-0 self-start sm:self-auto">
              All Synced
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="relative space-y-4 sm:space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className={cn(
            "rounded-xl p-3 text-center",
            "bg-muted/30 backdrop-blur-sm",
            "transition-all duration-200 hover:bg-muted/50"
          )}>
            <p className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">{totalItems}</p>
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground/70 uppercase tracking-wide">Total</p>
          </div>
          <div className={cn(
            "rounded-xl p-3 text-center",
            "bg-emerald-500/10 backdrop-blur-sm",
            "transition-all duration-200 hover:bg-emerald-500/15"
          )}>
            <p className="text-xl sm:text-2xl font-bold text-emerald-600 tabular-nums">{syncedItems}</p>
            <p className="text-[10px] sm:text-xs font-medium text-emerald-600/70 uppercase tracking-wide">Synced</p>
          </div>
          <div className={cn(
            "rounded-xl p-3 text-center",
            "bg-amber-500/10 backdrop-blur-sm",
            "transition-all duration-200 hover:bg-amber-500/15"
          )}>
            <p className="text-xl sm:text-2xl font-bold text-amber-600 tabular-nums">{unsyncedItems}</p>
            <p className="text-[10px] sm:text-xs font-medium text-amber-600/70 uppercase tracking-wide">Pending</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-muted-foreground">Sync Progress</span>
            <span className="font-semibold tabular-nums">{syncPercentage}%</span>
          </div>
          <Progress value={syncPercentage} className="h-2 sm:h-2.5 bg-muted/50" />
        </div>

        {/* Message */}
        {message && (
          <p className="text-xs sm:text-sm text-muted-foreground">{message}</p>
        )}

        {/* Sync Result */}
        {syncResult && (
          <div className={cn(
            'rounded-xl p-3 sm:p-4 text-xs sm:text-sm animate-in fade-in-0 slide-in-from-top-2 duration-300',
            syncResult.success
              ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/30'
              : 'bg-destructive/10 text-destructive border border-destructive/30'
          )}>
            <span className="font-medium">{syncResult.message}</span>
            {syncResult.created !== undefined && (
              <span className="block mt-1 opacity-80">
                Created: <span className="font-semibold tabular-nums">{syncResult.created}</span>, Failed: <span className="font-semibold tabular-nums">{syncResult.failed || 0}</span>
              </span>
            )}
          </div>
        )}

        {/* Sync Button */}
        {syncAvailable && syncActionHandler && (
          <Button
            onClick={handleSync}
            disabled={isSyncing}
            className={cn(
              "w-full h-10 sm:h-11 font-semibold",
              "transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98]"
            )}
            variant="default"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                {syncButtonLabel}
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
