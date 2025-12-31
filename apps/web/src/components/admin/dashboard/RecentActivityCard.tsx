'use client';

import { formatDistanceToNow, parseISO } from 'date-fns';
import {
  UserPlus,
  DollarSign,
  Calendar,
  Edit,
  MessageSquare,
  CheckCircle,
  Settings,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { RecentActivity, ActivityType } from '@/models/dashboard/adminDashboard.model';

interface RecentActivityCardProps {
  activities?: RecentActivity[];
  isLoading?: boolean;
}

const activityIcons: Record<ActivityType, React.ComponentType<{ className?: string }>> = {
  member_added: UserPlus,
  member_updated: Edit,
  donation_received: DollarSign,
  event_created: Calendar,
  event_updated: Edit,
  message_sent: MessageSquare,
  task_completed: CheckCircle,
  setting_changed: Settings,
};

const activityColors: Record<ActivityType, { bg: string; text: string }> = {
  member_added: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
  member_updated: { bg: 'bg-slate-100 dark:bg-slate-800/50', text: 'text-slate-600 dark:text-slate-400' },
  donation_received: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
  event_created: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
  event_updated: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
  message_sent: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400' },
  task_completed: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400' },
  setting_changed: { bg: 'bg-slate-100 dark:bg-slate-800/50', text: 'text-slate-600 dark:text-slate-400' },
};

function ActivityItem({ activity }: { activity: RecentActivity }) {
  const Icon = activityIcons[activity.type] || Activity;
  const colors = activityColors[activity.type] || activityColors.member_updated;

  const timeAgo = activity.timestamp
    ? formatDistanceToNow(parseISO(activity.timestamp), { addSuffix: true })
    : '';

  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className={`rounded-full p-1.5 shrink-0 ${colors.bg}`}>
        <Icon className={`h-3.5 w-3.5 ${colors.text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground line-clamp-1">
          {activity.description}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {timeAgo}
        </p>
      </div>
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Skeleton className="h-6 w-6 rounded-full" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

export function RecentActivityCard({ activities, isLoading }: RecentActivityCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="divide-y divide-border/50">
            <ActivitySkeleton />
            <ActivitySkeleton />
            <ActivitySkeleton />
            <ActivitySkeleton />
            <ActivitySkeleton />
          </div>
        ) : activities && activities.length > 0 ? (
          <div className="divide-y divide-border/50">
            {activities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <Activity className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No recent activity
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
