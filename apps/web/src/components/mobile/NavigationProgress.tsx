"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavigationProgressProps {
  /** Color of the progress bar */
  color?: string;
  /** Height of the progress bar in pixels */
  height?: number;
  /** Show spinner alongside progress bar */
  showSpinner?: boolean;
  /** Minimum time to show the loading state (ms) */
  minimumLoadTime?: number;
}

/**
 * NavigationProgress
 *
 * A centralized loading indicator that shows progress during page navigation.
 * Uses a top progress bar similar to NProgress, integrated with Next.js App Router.
 */
export function NavigationProgress({
  color = "var(--primary)",
  height = 3,
  showSpinner = true,
  minimumLoadTime = 200,
}: NavigationProgressProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const previousPathRef = useRef<string>("");

  // Simulate progress increments
  const startProgress = useCallback(() => {
    setIsLoading(true);
    setProgress(0);

    // Rapidly progress to ~30%, then slow down
    let currentProgress = 0;
    progressRef.current = setInterval(() => {
      currentProgress += Math.random() * 15;
      if (currentProgress >= 90) {
        currentProgress = 90;
        if (progressRef.current) {
          clearInterval(progressRef.current);
        }
      }
      setProgress(currentProgress);
    }, 100);
  }, []);

  const completeProgress = useCallback(() => {
    if (progressRef.current) {
      clearInterval(progressRef.current);
    }
    setProgress(100);

    // Hide after animation completes
    setTimeout(() => {
      setIsLoading(false);
      setProgress(0);
    }, 200);
  }, []);

  // Detect route changes
  useEffect(() => {
    const currentPath = pathname + searchParams.toString();

    if (previousPathRef.current && previousPathRef.current !== currentPath) {
      // Route changed, complete loading
      completeProgress();
    }

    previousPathRef.current = currentPath;
  }, [pathname, searchParams, completeProgress]);

  // Intercept link clicks to start loading
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");

      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Check if it's an internal navigation
      const isInternal =
        href.startsWith("/") ||
        href.startsWith(window.location.origin);

      // Skip external links, hash links, and same-page links
      if (!isInternal) return;
      if (href.startsWith("#")) return;
      if (href === window.location.pathname + window.location.search) return;

      // Check for data attributes that should skip loading
      if (anchor.hasAttribute("data-no-loading")) return;

      // Start the progress bar
      startProgress();
    };

    // Also handle programmatic navigation via history
    const handlePopState = () => {
      startProgress();
    };

    document.addEventListener("click", handleClick);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleClick);
      window.removeEventListener("popstate", handlePopState);
      if (progressRef.current) {
        clearInterval(progressRef.current);
      }
    };
  }, [startProgress]);

  if (!isLoading && progress === 0) return null;

  return (
    <>
      {/* Progress bar */}
      <div
        className="fixed left-0 right-0 top-0 z-[9999] pointer-events-none"
        style={{ height }}
      >
        <div
          className={cn(
            "h-full transition-all duration-200 ease-out",
            progress === 100 ? "opacity-0" : "opacity-100"
          )}
          style={{
            width: `${progress}%`,
            background: color,
            boxShadow: `0 0 10px ${color}, 0 0 5px ${color}`,
          }}
        />
      </div>

      {/* Optional spinner */}
      {showSpinner && isLoading && (
        <div className="fixed top-4 right-4 z-[9999] pointer-events-none">
          <div
            className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent"
            style={{ color }}
          />
        </div>
      )}
    </>
  );
}

/**
 * Hook to manually control navigation loading state
 */
export function useNavigationLoading() {
  const [isLoading, setIsLoading] = useState(false);

  const startLoading = useCallback(() => {
    setIsLoading(true);
    document.dispatchEvent(new CustomEvent("navigation:start"));
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
    document.dispatchEvent(new CustomEvent("navigation:end"));
  }, []);

  return { isLoading, startLoading, stopLoading };
}
