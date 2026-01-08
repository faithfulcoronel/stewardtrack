"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type ProgressRingStatus = "draft" | "active" | "on_track" | "at_risk" | "behind" | "completed" | "cancelled";

export interface GoalProgressRingProps {
  /** Progress percentage (0-100) */
  progress: number;
  /** Size of the ring in pixels */
  size?: number;
  /** Stroke width in pixels */
  strokeWidth?: number;
  /** Status to determine color */
  status?: ProgressRingStatus;
  /** Whether to show the percentage text */
  showLabel?: boolean;
  /** Custom label to show instead of percentage */
  label?: string;
  /** Additional CSS classes */
  className?: string;
  /** Animation duration in ms (0 to disable) */
  animationDuration?: number;
}

const statusColors: Record<ProgressRingStatus, { stroke: string; bg: string; text: string }> = {
  on_track: {
    stroke: "stroke-emerald-500",
    bg: "text-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  active: {
    stroke: "stroke-sky-500",
    bg: "text-sky-500/20",
    text: "text-sky-600 dark:text-sky-400",
  },
  at_risk: {
    stroke: "stroke-amber-500",
    bg: "text-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
  },
  behind: {
    stroke: "stroke-destructive",
    bg: "text-destructive/20",
    text: "text-destructive",
  },
  completed: {
    stroke: "stroke-primary",
    bg: "text-primary/20",
    text: "text-primary",
  },
  draft: {
    stroke: "stroke-muted-foreground",
    bg: "text-muted-foreground/20",
    text: "text-muted-foreground",
  },
  cancelled: {
    stroke: "stroke-muted-foreground/50",
    bg: "text-muted-foreground/10",
    text: "text-muted-foreground/70",
  },
};

export function GoalProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  status = "on_track",
  showLabel = true,
  label,
  className,
  animationDuration = 1000,
}: GoalProgressRingProps) {
  const normalizedProgress = Math.min(100, Math.max(0, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (normalizedProgress / 100) * circumference;

  const colors = statusColors[status] || statusColors.on_track;

  // For mobile touch feedback
  const [isPressed, setIsPressed] = React.useState(false);

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        "touch-manipulation select-none",
        "transition-transform duration-150",
        isPressed && "scale-95",
        className
      )}
      style={{ width: size, height: size }}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      role="progressbar"
      aria-valuenow={normalizedProgress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || `${normalizedProgress}% complete`}
    >
      {/* Background circle */}
      <svg
        className="absolute inset-0 -rotate-90"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={cn("transition-colors duration-300", colors.bg)}
          style={{ stroke: "currentColor" }}
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={cn("transition-all", colors.stroke)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: animationDuration > 0
              ? `stroke-dashoffset ${animationDuration}ms ease-out`
              : "none",
          }}
        />
      </svg>

      {/* Center content */}
      {showLabel && (
        <div className="relative z-10 flex flex-col items-center justify-center">
          <span
            className={cn(
              "font-semibold tracking-tight transition-colors",
              colors.text,
              size >= 100 ? "text-2xl" : size >= 60 ? "text-lg" : "text-sm"
            )}
          >
            {label || `${Math.round(normalizedProgress)}%`}
          </span>
          {size >= 80 && !label && (
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Complete
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default GoalProgressRing;
