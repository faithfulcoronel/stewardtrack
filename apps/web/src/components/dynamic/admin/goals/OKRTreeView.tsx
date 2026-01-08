"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { GoalProgressRing } from "./GoalProgressRing";
import { normalizeList } from "../../shared";

export type OKRStatus = "draft" | "active" | "on_track" | "at_risk" | "behind" | "completed" | "cancelled";
export type ObjectivePriority = "low" | "normal" | "high" | "urgent";

export interface KeyResultNode {
  id: string;
  title: string;
  progress: number;
  currentValue: number;
  targetValue: number;
  unitLabel?: string | null;
  status: "active" | "completed" | "cancelled";
}

export interface ObjectiveNode {
  id: string;
  title: string;
  description?: string | null;
  status: OKRStatus;
  priority: ObjectivePriority;
  progress: number;
  responsibleName?: string | null;
  dueDate?: string | null;
  keyResults?: KeyResultNode[];
}

export interface GoalNode {
  id: string;
  title: string;
  description?: string | null;
  category?: {
    name: string;
    color?: string | null;
    icon?: string | null;
  } | null;
  status: OKRStatus;
  progress: number;
  targetDate?: string | null;
  ownerName?: string | null;
  objectives?: ObjectiveNode[];
  directKeyResults?: KeyResultNode[];
}

export interface OKRTreeViewProps {
  /** Goal data with nested objectives and key results */
  goal?: GoalNode | null;
  /** Multiple goals */
  goals?: GoalNode[] | { items?: GoalNode[] } | null;
  /** Default expanded state */
  defaultExpanded?: boolean;
  /** Show actions */
  showActions?: boolean;
  /** Base URL for navigation */
  baseUrl?: string;
  /** Action handlers */
  onAddObjective?: (goalId: string) => void;
  onAddKeyResult?: (parentId: string, parentType: "goal" | "objective") => void;
  onRecordProgress?: (keyResultId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

const statusConfig: Record<OKRStatus, { label: string; className: string; dotColor: string }> = {
  draft: {
    label: "Draft",
    className: "bg-muted/50 text-muted-foreground border-muted-foreground/30",
    dotColor: "bg-muted-foreground",
  },
  active: {
    label: "Active",
    className: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30",
    dotColor: "bg-sky-500",
  },
  on_track: {
    label: "On Track",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    dotColor: "bg-emerald-500",
  },
  at_risk: {
    label: "At Risk",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    dotColor: "bg-amber-500",
  },
  behind: {
    label: "Behind",
    className: "bg-destructive/10 text-destructive border-destructive/30",
    dotColor: "bg-destructive",
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    dotColor: "bg-emerald-500",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-muted text-muted-foreground/70 border-border/40",
    dotColor: "bg-muted-foreground/50",
  },
};

const priorityConfig: Record<ObjectivePriority, { label: string; className: string }> = {
  low: { label: "Low", className: "text-muted-foreground" },
  normal: { label: "Normal", className: "text-foreground" },
  high: { label: "High", className: "text-amber-600 dark:text-amber-400" },
  urgent: { label: "Urgent", className: "text-destructive" },
};

function KeyResultItem({
  keyResult,
  onRecordProgress,
  onProgressUpdated,
}: {
  keyResult: KeyResultNode;
  onRecordProgress?: (id: string) => void;
  onProgressUpdated?: () => void;
}) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [newValue, setNewValue] = React.useState(String(keyResult.currentValue));
  const [notes, setNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const progressPercent = Math.min(100, Math.max(0, keyResult.progress));

  const handleOpenDialog = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRecordProgress) {
      // Use external handler if provided
      onRecordProgress(keyResult.id);
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
      onProgressUpdated?.();
      // Trigger page refresh to show updated progress
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record progress");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          "group flex items-center gap-3 py-2 px-3 rounded-md",
          "transition-colors hover:bg-muted/30",
          "touch-manipulation"
        )}
      >
        {/* Progress indicator */}
        <div className="relative w-8 h-8 shrink-0">
          <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
            <circle
              cx="16"
              cy="16"
              r="12"
              fill="none"
              className="stroke-muted/50"
              strokeWidth="3"
            />
            <circle
              cx="16"
              cy="16"
              r="12"
              fill="none"
              className={cn(
                "transition-all duration-300",
                keyResult.status === "completed"
                  ? "stroke-emerald-500"
                  : progressPercent >= 50
                  ? "stroke-primary"
                  : "stroke-amber-500"
              )}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${(progressPercent / 100) * 75.4} 75.4`}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-medium">
            {Math.round(progressPercent)}%
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground truncate">{keyResult.title}</p>
          <p className="text-[10px] text-muted-foreground">
            {keyResult.currentValue}
            {keyResult.unitLabel ? ` ${keyResult.unitLabel}` : ""} / {keyResult.targetValue}
            {keyResult.unitLabel ? ` ${keyResult.unitLabel}` : ""}
          </p>
        </div>

        {/* Update button - always show for active key results */}
        {keyResult.status === "active" && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleOpenDialog}
          >
            Update
          </Button>
        )}
      </div>

      {/* Progress Update Dialog */}
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
                    {keyResult.currentValue}
                    {keyResult.unitLabel ? ` ${keyResult.unitLabel}` : ""}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Target:</span>
                  <span className="font-medium text-foreground">
                    {keyResult.targetValue}
                    {keyResult.unitLabel ? ` ${keyResult.unitLabel}` : ""}
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
                  placeholder={`Enter new value`}
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
    </>
  );
}

function ObjectiveItem({
  objective,
  goalId,
  defaultExpanded,
  showActions,
  baseUrl,
  onAddKeyResult,
  onRecordProgress,
  router,
}: {
  objective: ObjectiveNode;
  goalId: string;
  defaultExpanded: boolean;
  showActions: boolean;
  baseUrl: string;
  onAddKeyResult?: (parentId: string, parentType: "goal" | "objective") => void;
  onRecordProgress?: (keyResultId: string) => void;
  router: ReturnType<typeof useRouter>;
}) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
  const status = statusConfig[objective.status] || statusConfig.active;
  const priority = priorityConfig[objective.priority] || priorityConfig.normal;
  const keyResults = objective.keyResults || [];

  const handleObjectiveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`${baseUrl}/${goalId}/objectives/${objective.id}`);
  };

  return (
    <div className="border-l-2 border-border/40 ml-4 pl-4">
      {/* Objective header */}
      <div
        className={cn(
          "flex items-start gap-3 py-2 cursor-pointer",
          "transition-colors hover:bg-muted/20 rounded-md px-2 -mx-2",
          "touch-manipulation"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setIsExpanded(!isExpanded)}
      >
        {/* Expand indicator */}
        <div className="flex items-center justify-center w-5 h-5 shrink-0 mt-0.5">
          <span
            className={cn(
              "text-xs text-muted-foreground transition-transform duration-200",
              isExpanded && "rotate-90"
            )}
          >
            ▶
          </span>
        </div>

        {/* Status dot */}
        <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", status.dotColor)} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4
              className="text-sm font-medium text-foreground hover:text-primary hover:underline cursor-pointer transition-colors"
              onClick={handleObjectiveClick}
              role="link"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleObjectiveClick(e as unknown as React.MouseEvent)}
            >
              {objective.title}
            </h4>
            <Badge
              variant="outline"
              className={cn("text-[9px] px-1.5 py-0 h-4 border", status.className)}
            >
              {status.label}
            </Badge>
            {objective.priority !== "normal" && (
              <span className={cn("text-[9px] font-medium", priority.className)}>
                {priority.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
            <span>{Math.round(objective.progress)}% complete</span>
            {objective.responsibleName && <span>• {objective.responsibleName}</span>}
            {keyResults.length > 0 && <span>• {keyResults.length} key results</span>}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-16 shrink-0">
          <Progress value={objective.progress} className="h-1.5" />
        </div>
      </div>

      {/* Key results (expandable) */}
      {isExpanded && (
        <div className="mt-1 ml-5 space-y-1">
          {keyResults.map((kr) => (
            <KeyResultItem
              key={kr.id}
              keyResult={kr}
              onRecordProgress={onRecordProgress}
            />
          ))}
          {keyResults.length === 0 && (
            <p className="text-xs text-muted-foreground/60 py-2 pl-3">
              No key results yet
            </p>
          )}
          {showActions && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground ml-3"
              onClick={(e) => {
                e.stopPropagation();
                if (onAddKeyResult) {
                  onAddKeyResult(objective.id, "objective");
                } else {
                  // Fallback to navigation when callback not provided
                  router.push(`${baseUrl}/${goalId}/objectives/${objective.id}/key-results/create`);
                }
              }}
            >
              + Add Key Result
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function SingleGoalTree({
  goal,
  defaultExpanded = true,
  showActions = true,
  baseUrl = "/admin/community/planning/goals",
  onAddObjective,
  onAddKeyResult,
  onRecordProgress,
  className,
}: Omit<OKRTreeViewProps, "goals"> & { goal: GoalNode }) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
  const status = statusConfig[goal.status] || statusConfig.active;
  const objectives = goal.objectives || [];
  const directKeyResults = goal.directKeyResults || [];
  const totalItems = objectives.length + directKeyResults.length;

  return (
    <Card className={cn("border-border/60 overflow-hidden", className)}>
      {/* Goal header */}
      <CardHeader
        className={cn(
          "cursor-pointer transition-colors hover:bg-muted/20",
          "touch-manipulation"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-4">
          {/* Progress ring */}
          <GoalProgressRing
            progress={goal.progress}
            status={goal.status}
            size={56}
            strokeWidth={5}
            showLabel
            animationDuration={600}
          />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {goal.category && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                  {goal.category.icon && <span className="mr-0.5">{goal.category.icon}</span>}
                  {goal.category.name}
                </Badge>
              )}
              <Badge
                variant="outline"
                className={cn("text-[10px] px-1.5 py-0 h-4 border", status.className)}
              >
                {status.label}
              </Badge>
            </div>
            <Link
              href={`${baseUrl}/${goal.id}`}
              className="block mt-1"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-semibold text-foreground hover:text-primary transition-colors line-clamp-2">
                {goal.title}
              </h3>
            </Link>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              {goal.ownerName && <span>Owner: {goal.ownerName}</span>}
              {totalItems > 0 && (
                <span>
                  {objectives.length} objectives • {directKeyResults.length + objectives.reduce((acc, o) => acc + (o.keyResults?.length || 0), 0)} key results
                </span>
              )}
            </div>
          </div>

          {/* Expand indicator */}
          <div className="flex items-center justify-center w-6 h-6 shrink-0">
            <span
              className={cn(
                "text-sm text-muted-foreground transition-transform duration-200",
                isExpanded && "rotate-90"
              )}
            >
              ▶
            </span>
          </div>
        </div>
      </CardHeader>

      {/* Expandable content */}
      {isExpanded && (
        <CardContent className="pt-0 space-y-2">
          {/* Direct key results */}
          {directKeyResults.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 pl-2">
                Direct Key Results
              </p>
              {directKeyResults.map((kr) => (
                <KeyResultItem
                  key={kr.id}
                  keyResult={kr}
                  onRecordProgress={onRecordProgress}
                />
              ))}
            </div>
          )}

          {/* Objectives */}
          {objectives.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 pl-2">
                Objectives
              </p>
              {objectives.map((obj) => (
                <ObjectiveItem
                  key={obj.id}
                  objective={obj}
                  goalId={goal.id}
                  defaultExpanded={defaultExpanded}
                  showActions={showActions}
                  baseUrl={baseUrl}
                  onAddKeyResult={onAddKeyResult}
                  onRecordProgress={onRecordProgress}
                  router={router}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {totalItems === 0 && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="mb-2 text-2xl">🎯</div>
              <p className="text-sm text-muted-foreground">
                No objectives or key results yet
              </p>
            </div>
          )}

          {/* Actions */}
          {showActions && (
            <div className="flex flex-wrap gap-2 pt-3 border-t border-border/40">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onAddObjective) {
                    onAddObjective(goal.id);
                  } else {
                    // Fallback to navigation when callback not provided
                    router.push(`${baseUrl}/${goal.id}/objectives/create`);
                  }
                }}
              >
                + Add Objective
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onAddKeyResult) {
                    onAddKeyResult(goal.id, "goal");
                  } else {
                    // Fallback to navigation when callback not provided
                    router.push(`${baseUrl}/${goal.id}/key-results/create`);
                  }
                }}
              >
                + Add Key Result
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export function OKRTreeView(props: OKRTreeViewProps) {
  const { goal, goals, className, ...rest } = props;

  // Single goal mode
  if (goal) {
    return <SingleGoalTree goal={goal} className={className} {...rest} />;
  }

  // List mode
  const goalsList = normalizeList<GoalNode>(goals);

  if (goalsList.length === 0) {
    return (
      <Card className={cn("border-border/60 border-dashed", className)}>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 text-4xl">🎯</div>
          <h3 className="text-lg font-medium text-foreground">No goals found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create strategic goals to track your church&apos;s progress
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {goalsList.map((g) => (
        <SingleGoalTree key={g.id} goal={g} {...rest} />
      ))}
    </div>
  );
}

export default OKRTreeView;
