"use client";

import { useEffect, useRef, useCallback, useState } from "react";

export type InactivityTimeoutConfig = {
  /** Timeout duration in milliseconds before showing warning (default: 15 minutes) */
  timeoutMs?: number;
  /** Warning duration in milliseconds before auto-logout (default: 60 seconds) */
  warningMs?: number;
  /** Events to track as user activity */
  events?: string[];
  /** Callback when warning should be shown */
  onWarning?: (remainingSeconds: number) => void;
  /** Callback when timeout occurs (user should be logged out) */
  onTimeout?: () => void;
  /** Callback when activity is detected during warning period */
  onActivityDuringWarning?: () => void;
  /** Whether the timeout is enabled (default: true) */
  enabled?: boolean;
};

export type InactivityTimeoutState = {
  /** Whether the warning dialog should be shown */
  showWarning: boolean;
  /** Remaining seconds before auto-logout */
  remainingSeconds: number;
  /** Reset the inactivity timer (call when user confirms they're still active) */
  resetTimer: () => void;
  /** Manually trigger logout */
  triggerLogout: () => void;
};

const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_WARNING_MS = 60 * 1000; // 60 seconds
const DEFAULT_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "click",
  "wheel",
];

export function useInactivityTimeout(
  config: InactivityTimeoutConfig = {}
): InactivityTimeoutState {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    warningMs = DEFAULT_WARNING_MS,
    events = DEFAULT_EVENTS,
    onWarning,
    onTimeout,
    onActivityDuringWarning,
    enabled = true,
  } = config;

  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(
    Math.ceil(warningMs / 1000)
  );

  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const isWarningActiveRef = useRef(false);
  const lastActivityRef = useRef<number>(Date.now());

  const clearTimers = useCallback(() => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
    if (warningIntervalRef.current) {
      clearInterval(warningIntervalRef.current);
      warningIntervalRef.current = null;
    }
  }, []);

  const triggerLogout = useCallback(() => {
    clearTimers();
    setShowWarning(false);
    isWarningActiveRef.current = false;
    onTimeout?.();
  }, [clearTimers, onTimeout]);

  const startWarningCountdown = useCallback(() => {
    isWarningActiveRef.current = true;
    setShowWarning(true);
    const totalSeconds = Math.ceil(warningMs / 1000);
    setRemainingSeconds(totalSeconds);
    onWarning?.(totalSeconds);

    let secondsLeft = totalSeconds;
    warningIntervalRef.current = setInterval(() => {
      secondsLeft -= 1;
      setRemainingSeconds(secondsLeft);

      if (secondsLeft <= 0) {
        triggerLogout();
      }
    }, 1000);
  }, [warningMs, onWarning, triggerLogout]);

  const resetTimer = useCallback(() => {
    clearTimers();
    lastActivityRef.current = Date.now();

    if (isWarningActiveRef.current) {
      isWarningActiveRef.current = false;
      setShowWarning(false);
      setRemainingSeconds(Math.ceil(warningMs / 1000));
      onActivityDuringWarning?.();
    }

    if (enabled) {
      timeoutIdRef.current = setTimeout(() => {
        startWarningCountdown();
      }, timeoutMs);
    }
  }, [
    clearTimers,
    enabled,
    timeoutMs,
    warningMs,
    startWarningCountdown,
    onActivityDuringWarning,
  ]);

  // Handle activity events
  const handleActivity = useCallback(() => {
    // Only reset if not in warning state - during warning, user must click "Stay Logged In"
    if (!isWarningActiveRef.current) {
      resetTimer();
    }
  }, [resetTimer]);

  // Set up event listeners and initial timer
  useEffect(() => {
    if (!enabled) {
      clearTimers();
      return;
    }

    // Start the initial timer
    resetTimer();

    // Add event listeners
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Check for activity across tabs using storage event
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "st-last-activity" && e.newValue) {
        const activityTime = parseInt(e.newValue, 10);
        if (activityTime > lastActivityRef.current) {
          handleActivity();
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);

    // Update localStorage on activity for cross-tab sync
    const updateStorage = () => {
      try {
        localStorage.setItem("st-last-activity", Date.now().toString());
      } catch {
        // localStorage might not be available
      }
    };
    events.forEach((event) => {
      window.addEventListener(event, updateStorage, { passive: true });
    });

    return () => {
      clearTimers();
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
        window.removeEventListener(event, updateStorage);
      });
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [enabled, events, handleActivity, resetTimer, clearTimers]);

  // Handle visibility change - check if session expired while tab was hidden
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const now = Date.now();
        const timeSinceLastActivity = now - lastActivityRef.current;

        // If we've been away longer than the timeout + warning period, log out
        if (timeSinceLastActivity >= timeoutMs + warningMs) {
          triggerLogout();
        }
        // If we've been away longer than the timeout but within warning period
        else if (timeSinceLastActivity >= timeoutMs) {
          if (!isWarningActiveRef.current) {
            startWarningCountdown();
          }
        }
        // Otherwise, just reset the timer
        else {
          resetTimer();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    enabled,
    timeoutMs,
    warningMs,
    triggerLogout,
    startWarningCountdown,
    resetTimer,
  ]);

  return {
    showWarning,
    remainingSeconds,
    resetTimer,
    triggerLogout,
  };
}
