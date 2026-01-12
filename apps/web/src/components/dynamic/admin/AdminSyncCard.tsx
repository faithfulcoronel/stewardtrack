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
    <Card className="border-border/60">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg',
              syncAvailable ? 'bg-amber-500/10' : 'bg-emerald-500/10'
            )}>
              <IconComponent className={cn(
                'h-5 w-5',
                syncAvailable ? 'text-amber-600' : 'text-emerald-600'
              )} />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">{title}</CardTitle>
              <CardDescription className="text-sm">{description}</CardDescription>
            </div>
          </div>
          {syncAvailable ? (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
              Action Required
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
              All Synced
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <p className="text-2xl font-semibold text-foreground">{totalItems}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-semibold text-emerald-600">{syncedItems}</p>
            <p className="text-xs text-muted-foreground">Synced</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-semibold text-amber-600">{unsyncedItems}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Sync Progress</span>
            <span className="font-medium">{syncPercentage}%</span>
          </div>
          <Progress value={syncPercentage} className="h-2" />
        </div>

        {/* Message */}
        {message && (
          <p className="text-sm text-muted-foreground">{message}</p>
        )}

        {/* Sync Result */}
        {syncResult && (
          <div className={cn(
            'rounded-md p-3 text-sm',
            syncResult.success ? 'bg-emerald-500/10 text-emerald-700' : 'bg-destructive/10 text-destructive'
          )}>
            {syncResult.message}
            {syncResult.created !== undefined && (
              <span className="block mt-1">
                Created: {syncResult.created}, Failed: {syncResult.failed || 0}
              </span>
            )}
          </div>
        )}

        {/* Sync Button */}
        {syncAvailable && syncActionHandler && (
          <Button
            onClick={handleSync}
            disabled={isSyncing}
            className="w-full"
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
