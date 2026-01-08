"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GoalProgressRing } from "./GoalProgressRing";
import { normalizeList } from "../../shared";

export type GoalStatus = "draft" | "active" | "on_track" | "at_risk" | "behind" | "completed" | "cancelled";

export interface GoalCardData {
  id: string;
  title: string;
  description?: string | null;
  category?: {
    name: string;
    color?: string | null;
    icon?: string | null;
  } | null;
  status: GoalStatus;
  progress: number;
  targetDate?: string | null;
  ownerName?: string | null;
  objectivesCount?: number;
  keyResultsCount?: number;
  tags?: string[];
}

export interface GoalCardProps {
  /** Goal data */
  goal?: GoalCardData | null;
  /** Goals array for list mode */
  goals?: GoalCardData[] | { items?: GoalCardData[] } | null;
  /** Card variant */
  variant?: "default" | "compact" | "featured";
  /** Show progress ring */
  showProgress?: boolean;
  /** Show quick actions */
  showActions?: boolean;
  /** Base URL for goal links */
  baseUrl?: string;
  /** Action handlers (for client-side interactions) */
  onViewDetails?: (goalId: string) => void;
  onRecordProgress?: (goalId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

const statusConfig: Record<GoalStatus, { label: string; variant: string; className: string }> = {
  draft: {
    label: "Draft",
    variant: "outline",
    className: "bg-muted/50 text-muted-foreground border-muted-foreground/30",
  },
  active: {
    label: "Active",
    variant: "outline",
    className: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30",
  },
  on_track: {
    label: "On Track",
    variant: "outline",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  },
  at_risk: {
    label: "At Risk",
    variant: "outline",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
  behind: {
    label: "Behind",
    variant: "outline",
    className: "bg-destructive/10 text-destructive border-destructive/30",
  },
  completed: {
    label: "Completed",
    variant: "outline",
    className: "bg-primary/10 text-primary border-primary/30",
  },
  cancelled: {
    label: "Cancelled",
    variant: "outline",
    className: "bg-muted text-muted-foreground/70 border-border/40",
  },
};

function formatTargetDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  if (diffDays <= 7) return `${diffDays}d left`;
  if (diffDays <= 30) return `${Math.ceil(diffDays / 7)}w left`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function SingleGoalCard({
  goal,
  variant = "default",
  showProgress = true,
  showActions = true,
  baseUrl = "/admin/community/planning/goals",
  onViewDetails,
  onRecordProgress,
  className,
}: Omit<GoalCardProps, "goals"> & { goal: GoalCardData }) {
  const status = statusConfig[goal.status] || statusConfig.active;
  const detailUrl = `${baseUrl}/${goal.id}`;
  const isCompact = variant === "compact";
  const isFeatured = variant === "featured";

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border-border/60",
        "transition-all duration-200",
        "hover:border-border hover:shadow-md",
        "active:scale-[0.98]",
        isFeatured && "border-primary/40 bg-primary/5",
        className
      )}
    >
      {/* Category color indicator */}
      {goal.category?.color && (
        <div
          className="absolute left-0 top-0 h-full w-1"
          style={{ backgroundColor: goal.category.color }}
        />
      )}

      <CardHeader className={cn("space-y-3", isCompact && "py-3", goal.category?.color && "pl-4")}>
        {/* Top row: Category badge + Status */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {goal.category && (
            <Badge
              variant="outline"
              className="border-border/60 bg-background/50 text-xs font-medium"
            >
              {goal.category.icon && <span className="mr-1">{goal.category.icon}</span>}
              {goal.category.name}
            </Badge>
          )}
          <Badge
            variant="outline"
            className={cn("border text-xs font-medium", status.className)}
          >
            {status.label}
          </Badge>
        </div>

        {/* Title */}
        <Link
          href={detailUrl}
          className="block"
          onClick={(e) => {
            if (onViewDetails) {
              e.preventDefault();
              onViewDetails(goal.id);
            }
          }}
        >
          <h3
            className={cn(
              "font-semibold text-foreground",
              "line-clamp-2 transition-colors",
              "group-hover:text-primary",
              isFeatured ? "text-lg" : "text-base"
            )}
          >
            {goal.title}
          </h3>
        </Link>

        {/* Description (non-compact) */}
        {!isCompact && goal.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {goal.description}
          </p>
        )}
      </CardHeader>

      <CardContent className={cn("space-y-4", isCompact && "pb-3 pt-0")}>
        {/* Progress section */}
        {showProgress && (
          <div className="flex items-center gap-4">
            <GoalProgressRing
              progress={goal.progress}
              status={goal.status}
              size={isCompact ? 48 : 64}
              strokeWidth={isCompact ? 4 : 6}
              showLabel={!isCompact}
              animationDuration={800}
            />
            <div className="flex-1 min-w-0 space-y-1">
              {/* Stats row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {goal.objectivesCount !== undefined && (
                  <span className="flex items-center gap-1">
                    <span className="text-xs">🎯</span>
                    <span>{goal.objectivesCount} objectives</span>
                  </span>
                )}
                {goal.keyResultsCount !== undefined && (
                  <span className="flex items-center gap-1">
                    <span className="text-xs">📊</span>
                    <span>{goal.keyResultsCount} key results</span>
                  </span>
                )}
              </div>

              {/* Target date & owner */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground/80">
                {goal.targetDate && (
                  <span className={cn(
                    formatTargetDate(goal.targetDate).includes("overdue") && "text-destructive"
                  )}>
                    {formatTargetDate(goal.targetDate)}
                  </span>
                )}
                {goal.ownerName && (
                  <span className="truncate">
                    Owner: {goal.ownerName}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tags */}
        {!isCompact && goal.tags && goal.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {goal.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-muted/50 px-2 py-0.5 text-[10px] font-normal"
              >
                {tag}
              </Badge>
            ))}
            {goal.tags.length > 3 && (
              <Badge
                variant="secondary"
                className="bg-muted/50 px-2 py-0.5 text-[10px] font-normal"
              >
                +{goal.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Actions */}
        {showActions && !isCompact && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 flex-1 min-w-[100px] text-xs"
              asChild
            >
              <Link
                href={detailUrl}
                onClick={(e) => {
                  if (onViewDetails) {
                    e.preventDefault();
                    onViewDetails(goal.id);
                  }
                }}
              >
                View Details
              </Link>
            </Button>
            {goal.status !== "completed" && goal.status !== "cancelled" && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 flex-1 min-w-[100px] text-xs"
                onClick={() => onRecordProgress?.(goal.id)}
              >
                Record Progress
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function GoalCard(props: GoalCardProps) {
  const { goal, goals, className, ...rest } = props;

  // Single goal mode
  if (goal) {
    return <SingleGoalCard goal={goal} className={className} {...rest} />;
  }

  // List mode
  const goalsList = normalizeList<GoalCardData>(goals);

  if (goalsList.length === 0) {
    return (
      <Card className={cn("border-border/60 border-dashed", className)}>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 text-4xl">🎯</div>
          <h3 className="text-lg font-medium text-foreground">No goals yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first strategic goal to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-4",
        "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      {goalsList.map((g) => (
        <SingleGoalCard key={g.id} goal={g} {...rest} />
      ))}
    </div>
  );
}

export default GoalCard;
