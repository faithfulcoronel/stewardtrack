"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { normalizeList } from "../../shared";

export type TimelineEventType =
  | "goal_created"
  | "goal_updated"
  | "status_changed"
  | "progress_recorded"
  | "objective_added"
  | "key_result_added"
  | "milestone_reached"
  | "comment_added"
  | "assignment_changed";

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  title: string;
  description?: string | null;
  timestamp: string;
  user?: {
    name: string;
    avatar?: string | null;
  } | null;
  metadata?: {
    oldValue?: string | null;
    newValue?: string | null;
    progress?: number | null;
    targetName?: string | null;
  } | null;
}

export interface GoalStatusTimelineProps {
  /** Timeline title */
  title?: string;
  /** Timeline description */
  description?: string;
  /** Timeline events */
  events?: TimelineEvent[] | { items?: TimelineEvent[] } | null;
  /** Max events to show (0 = all) */
  maxEvents?: number;
  /** Show load more button */
  showLoadMore?: boolean;
  /** Show relative time */
  showRelativeTime?: boolean;
  /** Variant style */
  variant?: "default" | "compact" | "minimal";
  /** On load more callback */
  onLoadMore?: () => void;
  /** Additional CSS classes */
  className?: string;
}

const eventConfig: Record<TimelineEventType, { icon: string; color: string; label: string }> = {
  goal_created: {
    icon: "🎯",
    color: "bg-primary/20 text-primary border-primary/40",
    label: "Goal Created",
  },
  goal_updated: {
    icon: "✏️",
    color: "bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-500/40",
    label: "Goal Updated",
  },
  status_changed: {
    icon: "🔄",
    color: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40",
    label: "Status Changed",
  },
  progress_recorded: {
    icon: "📊",
    color: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40",
    label: "Progress Recorded",
  },
  objective_added: {
    icon: "📋",
    color: "bg-violet-500/20 text-violet-600 dark:text-violet-400 border-violet-500/40",
    label: "Objective Added",
  },
  key_result_added: {
    icon: "📈",
    color: "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/40",
    label: "Key Result Added",
  },
  milestone_reached: {
    icon: "🏆",
    color: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/40",
    label: "Milestone Reached",
  },
  comment_added: {
    icon: "💬",
    color: "bg-muted text-muted-foreground border-border/60",
    label: "Comment Added",
  },
  assignment_changed: {
    icon: "👤",
    color: "bg-pink-500/20 text-pink-600 dark:text-pink-400 border-pink-500/40",
    label: "Assignment Changed",
  },
};

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSecs < 60) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatFullDate(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function TimelineEventItem({
  event,
  isFirst,
  isLast,
  showRelativeTime,
  variant,
}: {
  event: TimelineEvent;
  isFirst: boolean;
  isLast: boolean;
  showRelativeTime: boolean;
  variant: "default" | "compact" | "minimal";
}) {
  const config = eventConfig[event.type] || eventConfig.goal_updated;
  const isCompact = variant === "compact";
  const isMinimal = variant === "minimal";

  return (
    <div className={cn("relative flex gap-3", !isLast && "pb-6")}>
      {/* Timeline line */}
      {!isLast && (
        <div
          className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-border/60"
          aria-hidden="true"
        />
      )}

      {/* Icon */}
      <div
        className={cn(
          "relative z-10 flex items-center justify-center shrink-0",
          "w-8 h-8 rounded-full border-2 bg-background",
          config.color,
          "text-sm"
        )}
      >
        {config.icon}
      </div>

      {/* Content */}
      <div className={cn("flex-1 min-w-0", isMinimal && "space-y-0.5")}>
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "font-medium text-foreground",
                isCompact || isMinimal ? "text-sm" : "text-base"
              )}
            >
              {event.title}
            </p>
            {!isMinimal && event.user && (
              <p className="text-xs text-muted-foreground mt-0.5">
                by {event.user.name}
              </p>
            )}
          </div>
          <time
            className={cn(
              "text-muted-foreground shrink-0",
              isCompact || isMinimal ? "text-[10px]" : "text-xs"
            )}
            dateTime={event.timestamp}
            title={formatFullDate(event.timestamp)}
          >
            {showRelativeTime ? formatTimeAgo(event.timestamp) : formatFullDate(event.timestamp)}
          </time>
        </div>

        {/* Description */}
        {!isMinimal && event.description && (
          <p
            className={cn(
              "text-muted-foreground mt-1",
              isCompact ? "text-xs" : "text-sm"
            )}
          >
            {event.description}
          </p>
        )}

        {/* Metadata */}
        {!isMinimal && event.metadata && (
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {event.metadata.oldValue && event.metadata.newValue && (
              <div className="flex items-center gap-1.5 text-xs">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-muted/50">
                  {event.metadata.oldValue}
                </Badge>
                <span className="text-muted-foreground">→</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-primary/10 border-primary/30 text-primary">
                  {event.metadata.newValue}
                </Badge>
              </div>
            )}
            {event.metadata.progress !== undefined && event.metadata.progress !== null && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-5 bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              >
                {event.metadata.progress}% complete
              </Badge>
            )}
            {event.metadata.targetName && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                {event.metadata.targetName}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function GoalStatusTimeline({
  title = "Activity",
  description,
  events,
  maxEvents = 10,
  showLoadMore = false,
  showRelativeTime = true,
  variant = "default",
  onLoadMore,
  className,
}: GoalStatusTimelineProps) {
  const eventsList = normalizeList<TimelineEvent>(events);
  const displayEvents = maxEvents > 0 ? eventsList.slice(0, maxEvents) : eventsList;
  const hasMore = maxEvents > 0 && eventsList.length > maxEvents;

  if (eventsList.length === 0) {
    return (
      <Card className={cn("border-border/60 border-dashed", className)}>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-3 text-3xl">📭</div>
          <h4 className="text-sm font-medium text-foreground">No activity yet</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Activity will appear here as progress is made
          </p>
        </CardContent>
      </Card>
    );
  }

  const isMinimal = variant === "minimal";

  if (isMinimal) {
    // Minimal variant - no card wrapper
    return (
      <div className={cn("space-y-4", className)}>
        {(title || description) && (
          <div className="space-y-1">
            {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
        )}
        <div className="relative">
          {displayEvents.map((event, index) => (
            <TimelineEventItem
              key={event.id}
              event={event}
              isFirst={index === 0}
              isLast={index === displayEvents.length - 1}
              showRelativeTime={showRelativeTime}
              variant={variant}
            />
          ))}
        </div>
        {showLoadMore && hasMore && (
          <button
            onClick={onLoadMore}
            className={cn(
              "w-full text-center py-2 text-xs text-muted-foreground",
              "hover:text-foreground transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
            )}
          >
            Show {eventsList.length - maxEvents} more events
          </button>
        )}
      </div>
    );
  }

  return (
    <Card className={cn("border-border/60", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="relative">
        {displayEvents.map((event, index) => (
          <TimelineEventItem
            key={event.id}
            event={event}
            isFirst={index === 0}
            isLast={index === displayEvents.length - 1}
            showRelativeTime={showRelativeTime}
            variant={variant}
          />
        ))}
        {showLoadMore && hasMore && (
          <button
            onClick={onLoadMore}
            className={cn(
              "w-full text-center py-3 text-sm text-muted-foreground",
              "hover:text-foreground transition-colors",
              "border-t border-border/40 mt-4 -mb-2",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            )}
          >
            Show {eventsList.length - maxEvents} more events
          </button>
        )}
      </CardContent>
    </Card>
  );
}

export default GoalStatusTimeline;
