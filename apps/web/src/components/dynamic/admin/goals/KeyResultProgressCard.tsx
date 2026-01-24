"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { normalizeList } from "../../shared";

export type KeyResultStatus = "active" | "completed" | "cancelled";
export type MetricType = "number" | "percentage" | "currency" | "boolean";
export type UpdateFrequency = "daily" | "weekly" | "biweekly" | "monthly" | "quarterly";

export interface KeyResultData {
  id: string;
  title: string;
  description?: string | null;
  metricType: MetricType;
  targetValue: number;
  currentValue: number;
  startingValue?: number;
  unitLabel?: string | null;
  progress: number;
  status: KeyResultStatus;
  updateFrequency?: UpdateFrequency | null;
  nextUpdateDue?: string | null;
  lastUpdatedAt?: string | null;
  isAutoLinked?: boolean;
  metricLinkType?: string | null;
  parentTitle?: string | null;
  parentType?: "goal" | "objective";
}

export interface KeyResultProgressCardProps {
  /** Single key result */
  keyResult?: KeyResultData | null;
  /** List of key results */
  keyResults?: KeyResultData[] | { items?: KeyResultData[] } | null;
  /** Variant style */
  variant?: "default" | "compact" | "inline";
  /** Show update button */
  showUpdateButton?: boolean;
  /** Show parent reference */
  showParent?: boolean;
  /** On update progress callback */
  onUpdateProgress?: (keyResultId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

const statusConfig: Record<KeyResultStatus, { label: string; className: string }> = {
  active: {
    label: "Active",
    className: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30",
  },
  completed: {
    label: "Done",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-muted text-muted-foreground/70 border-border/40",
  },
};

const frequencyLabels: Record<UpdateFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Bi-weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
};

function formatMetricValue(
  value: number,
  metricType: MetricType,
  unitLabel?: string | null
): string {
  switch (metricType) {
    case "percentage":
      return `${value}%`;
    case "currency":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case "boolean":
      return value >= 1 ? "Yes" : "No";
    case "number":
    default:
      const formatted = new Intl.NumberFormat("en-US").format(value);
      return unitLabel ? `${formatted} ${unitLabel}` : formatted;
  }
}

function formatUpdateDue(dateStr: string | null | undefined): { text: string; isOverdue: boolean } {
  if (!dateStr) return { text: "", isOverdue: false };
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { text: `${Math.abs(diffDays)}d overdue`, isOverdue: true };
  if (diffDays === 0) return { text: "Update due today", isOverdue: false };
  if (diffDays === 1) return { text: "Due tomorrow", isOverdue: false };
  if (diffDays <= 7) return { text: `Due in ${diffDays}d`, isOverdue: false };
  return { text: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }), isOverdue: false };
}

function getProgressColor(progress: number, status: KeyResultStatus): string {
  if (status === "completed") return "bg-emerald-500";
  if (status === "cancelled") return "bg-muted-foreground/30";
  if (progress >= 75) return "bg-emerald-500";
  if (progress >= 50) return "bg-primary";
  if (progress >= 25) return "bg-amber-500";
  return "bg-destructive";
}

function SingleKeyResultCard({
  keyResult,
  variant = "default",
  showUpdateButton = true,
  showParent = false,
  onUpdateProgress,
  className,
}: Omit<KeyResultProgressCardProps, "keyResults"> & { keyResult: KeyResultData }) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [newValue, setNewValue] = React.useState(String(keyResult.currentValue));
  const [notes, setNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const status = statusConfig[keyResult.status] || statusConfig.active;
  const isCompact = variant === "compact";
  const isInline = variant === "inline";
  const updateDue = formatUpdateDue(keyResult.nextUpdateDue);

  // Calculate the visual progress
  const progressPercent = Math.min(100, Math.max(0, keyResult.progress));
  const progressColor = getProgressColor(progressPercent, keyResult.status);

  const handleOpenDialog = () => {
    if (onUpdateProgress) {
      // Use external handler if provided
      onUpdateProgress(keyResult.id);
    } else {
      // Use built-in dialog
      setNewValue(String(keyResult.currentValue));
      setNotes("");
      setError(null);
      setIsDialogOpen(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/community/planning/goals/key-results/${keyResult.id}/progress`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            new_value: parseFloat(newValue),
            notes: notes || undefined,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to record progress");
      }

      setIsDialogOpen(false);
      // Trigger page refresh to show updated progress
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record progress");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Progress Update Dialog component
  const progressDialog = (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="sm:max-w-md w-[calc(100%-2rem)] mx-auto">
        <DialogHeader>
          <DialogTitle>Record Progress</DialogTitle>
          <DialogDescription>
            Update the current value for "{keyResult.title}"
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Current progress summary */}
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Current:</span>
                <span className="font-medium text-foreground">
                  {formatMetricValue(keyResult.currentValue, keyResult.metricType, keyResult.unitLabel)}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Target:</span>
                <span className="font-medium text-foreground">
                  {formatMetricValue(keyResult.targetValue, keyResult.metricType, keyResult.unitLabel)}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground mt-1 pt-1 border-t">
                <span>Progress:</span>
                <span className="font-medium text-foreground">{Math.round(progressPercent)}%</span>
              </div>
            </div>

            {/* New value input */}
            <div className="grid gap-2">
              <Label htmlFor="newValue">
                New Value{keyResult.unitLabel ? ` (${keyResult.unitLabel})` : ""}
              </Label>
              <Input
                id="newValue"
                type="number"
                step="any"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Enter new value"
                required
              />
            </div>

            {/* Notes input */}
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add context about this update..."
                rows={3}
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Progress"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  if (isInline) {
    // Inline variant - single row
    return (
      <>
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg border border-border/60 p-3",
            "transition-colors hover:bg-muted/30",
            className
          )}
        >
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground truncate">
                {keyResult.title}
              </span>
              {keyResult.isAutoLinked && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-primary/5">
                  Auto
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Progress
                value={progressPercent}
                className={cn("h-1.5 flex-1", progressColor)}
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatMetricValue(keyResult.currentValue, keyResult.metricType, keyResult.unitLabel)}
                {" / "}
                {formatMetricValue(keyResult.targetValue, keyResult.metricType, keyResult.unitLabel)}
              </span>
            </div>
          </div>
          {showUpdateButton && keyResult.status === "active" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs shrink-0"
              onClick={handleOpenDialog}
            >
              Update
            </Button>
          )}
        </div>
        {progressDialog}
      </>
    );
  }

  return (
    <>
      <Card
        className={cn(
          "group border-border/60 overflow-hidden",
          "transition-all duration-200",
          "hover:border-border hover:shadow-sm",
          keyResult.status === "completed" && "bg-emerald-500/5",
          className
        )}
      >
        <CardHeader className={cn("space-y-2", isCompact && "py-3")}>
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {/* Parent reference */}
              {showParent && keyResult.parentTitle && (
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-1">
                  {keyResult.parentType === "objective" ? "Objective" : "Goal"}: {keyResult.parentTitle}
                </p>
              )}
              <h4 className="text-sm font-medium text-foreground line-clamp-2">
                {keyResult.title}
              </h4>
            </div>
            <Badge
              variant="outline"
              className={cn("shrink-0 text-[10px] border", status.className)}
            >
              {status.label}
            </Badge>
          </div>

          {/* Description */}
          {!isCompact && keyResult.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {keyResult.description}
            </p>
          )}
        </CardHeader>

        <CardContent className={cn("space-y-4", isCompact && "pb-3 pt-0")}>
          {/* Progress visualization */}
          <div className="space-y-2">
            {/* Progress bar */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Progress
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {Math.round(progressPercent)}%
                </span>
              </div>
              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted/50">
                <div
                  className={cn(
                    "h-full transition-all duration-500 ease-out rounded-full",
                    progressColor
                  )}
                  style={{ width: `${progressPercent}%` }}
                />
                {/* Target marker */}
                <div
                  className="absolute top-0 h-full w-0.5 bg-foreground/20"
                  style={{ left: "100%" }}
                />
              </div>
            </div>

            {/* Value display */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {keyResult.startingValue !== undefined && (
                  <>
                    Start:{" "}
                    <span className="font-medium text-foreground">
                      {formatMetricValue(keyResult.startingValue, keyResult.metricType, keyResult.unitLabel)}
                    </span>
                  </>
                )}
              </span>
              <span className="text-muted-foreground">
                Current:{" "}
                <span className="font-semibold text-foreground">
                  {formatMetricValue(keyResult.currentValue, keyResult.metricType, keyResult.unitLabel)}
                </span>
                {" / "}
                <span className="font-medium">
                  {formatMetricValue(keyResult.targetValue, keyResult.metricType, keyResult.unitLabel)}
                </span>
              </span>
            </div>
          </div>

          {/* Meta info */}
          {!isCompact && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground/80">
              {keyResult.isAutoLinked && (
                <span className="flex items-center gap-1">
                  <span>🔗</span>
                  <span>Auto-linked</span>
                </span>
              )}
              {keyResult.updateFrequency && (
                <span className="flex items-center gap-1">
                  <span>📅</span>
                  <span>{frequencyLabels[keyResult.updateFrequency]}</span>
                </span>
              )}
              {updateDue.text && (
                <span className={cn(
                  "flex items-center gap-1",
                  updateDue.isOverdue && "text-destructive font-medium"
                )}>
                  <span>{updateDue.isOverdue ? "⚠️" : "⏰"}</span>
                  <span>{updateDue.text}</span>
                </span>
              )}
            </div>
          )}

          {/* Update button */}
          {showUpdateButton && keyResult.status === "active" && (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-9 text-xs"
              onClick={handleOpenDialog}
            >
              <span className="mr-1.5">📝</span>
              Record Progress
            </Button>
          )}
        </CardContent>
      </Card>
      {progressDialog}
    </>
  );
}

export function KeyResultProgressCard(props: KeyResultProgressCardProps) {
  const { keyResult, keyResults, className, ...rest } = props;

  // Single key result mode
  if (keyResult) {
    return <SingleKeyResultCard keyResult={keyResult} className={className} {...rest} />;
  }

  // List mode
  const krList = normalizeList<KeyResultData>(keyResults);

  if (krList.length === 0) {
    return (
      <Card className={cn("border-border/60 border-dashed", className)}>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-3 text-3xl">📊</div>
          <h4 className="text-sm font-medium text-foreground">No key results</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Add measurable key results to track progress
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {krList.map((kr) => (
        <SingleKeyResultCard key={kr.id} keyResult={kr} {...rest} />
      ))}
    </div>
  );
}

export default KeyResultProgressCard;
