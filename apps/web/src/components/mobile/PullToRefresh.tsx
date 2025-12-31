"use client";

import { useState, useRef, useCallback, type ReactNode, type TouchEvent } from "react";
import { isNative, haptics } from "@stewardtrack/native-bridge";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

interface PullToRefreshProps {
  children: ReactNode;
  /** Callback function to execute on refresh */
  onRefresh: () => Promise<void>;
  /** Threshold in pixels to trigger refresh */
  threshold?: number;
  /** Maximum pull distance */
  maxPull?: number;
  /** Disable pull to refresh */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

type RefreshState = "idle" | "pulling" | "threshold" | "refreshing";

/**
 * PullToRefresh
 *
 * A pull-to-refresh component that works on both web and native platforms.
 * Provides visual feedback and haptic feedback on native devices.
 */
export function PullToRefresh({
  children,
  onRefresh,
  threshold = 80,
  maxPull = 120,
  disabled = false,
  className,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshState, setRefreshState] = useState<RefreshState>("idle");
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number>(0);
  const currentY = useRef<number>(0);
  const isAtTop = useRef<boolean>(false);

  const handleTouchStart = useCallback(
    (e: TouchEvent<HTMLDivElement>) => {
      if (disabled || refreshState === "refreshing") return;

      // Check if we're at the top of the scroll container
      const container = containerRef.current;
      if (!container) return;

      isAtTop.current = container.scrollTop <= 0;
      if (!isAtTop.current) return;

      startY.current = e.touches[0].clientY;
      currentY.current = e.touches[0].clientY;
    },
    [disabled, refreshState]
  );

  const handleTouchMove = useCallback(
    async (e: TouchEvent<HTMLDivElement>) => {
      if (disabled || refreshState === "refreshing" || !isAtTop.current) return;

      currentY.current = e.touches[0].clientY;
      const diff = currentY.current - startY.current;

      // Only activate on downward pull
      if (diff > 0) {
        // Apply resistance for a more natural feel
        const resistance = 0.5;
        const pull = Math.min(diff * resistance, maxPull);
        setPullDistance(pull);

        // Update state based on pull distance
        if (pull >= threshold && refreshState !== "threshold") {
          setRefreshState("threshold");
          // Haptic feedback when reaching threshold
          if (isNative()) {
            await haptics.impact("medium");
          }
        } else if (pull < threshold && pull > 0 && refreshState !== "pulling") {
          setRefreshState("pulling");
        }

        // Prevent default scroll behavior when pulling
        if (pull > 0) {
          e.preventDefault();
        }
      }
    },
    [disabled, refreshState, threshold, maxPull]
  );

  const handleTouchEnd = useCallback(async () => {
    if (disabled || refreshState === "refreshing") return;

    if (pullDistance >= threshold) {
      // Trigger refresh
      setRefreshState("refreshing");
      setPullDistance(threshold / 2); // Keep spinner visible

      // Haptic feedback
      if (isNative()) {
        await haptics.notification("success");
      }

      try {
        await onRefresh();
      } finally {
        setRefreshState("idle");
        setPullDistance(0);
      }
    } else {
      // Reset
      setRefreshState("idle");
      setPullDistance(0);
    }
  }, [disabled, refreshState, pullDistance, threshold, onRefresh]);

  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 180;

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-auto", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: refreshState === "idle" ? "auto" : "none" }}
    >
      {/* Pull indicator */}
      <div
        className={cn(
          "absolute left-0 right-0 flex items-center justify-center transition-opacity duration-200",
          pullDistance > 0 || refreshState === "refreshing" ? "opacity-100" : "opacity-0"
        )}
        style={{
          top: 0,
          height: `${Math.max(pullDistance, refreshState === "refreshing" ? threshold / 2 : 0)}px`,
          transform: `translateY(-100%)`,
        }}
      >
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-primary/10 p-2",
            refreshState === "refreshing" && "animate-spin"
          )}
          style={{
            transform: refreshState === "refreshing" ? undefined : `rotate(${rotation}deg)`,
          }}
        >
          <RefreshCw
            className={cn(
              "h-5 w-5",
              refreshState === "threshold" ? "text-primary" : "text-muted-foreground"
            )}
          />
        </div>
      </div>

      {/* Content with pull offset */}
      <div
        className="transition-transform duration-200 ease-out"
        style={{
          transform:
            pullDistance > 0 || refreshState === "refreshing"
              ? `translateY(${pullDistance}px)`
              : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Hook to manage pull-to-refresh state
 */
export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, onRefresh]);

  return { isRefreshing, refresh };
}
