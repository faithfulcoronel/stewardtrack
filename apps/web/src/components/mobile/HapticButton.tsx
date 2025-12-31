"use client";

import { forwardRef, type ButtonHTMLAttributes, type MouseEvent } from "react";
import { isNative, haptics } from "@stewardtrack/native-bridge";
import { Button, type ButtonProps } from "@/components/ui/button";

type HapticStyle = "light" | "medium" | "heavy";

interface HapticButtonProps extends ButtonProps {
  /** Haptic feedback style on press */
  hapticStyle?: HapticStyle;
  /** Disable haptic feedback */
  disableHaptics?: boolean;
}

/**
 * HapticButton
 *
 * A button component that provides haptic feedback on native platforms.
 * Wraps the standard Button component with haptic capabilities.
 */
export const HapticButton = forwardRef<HTMLButtonElement, HapticButtonProps>(
  ({ hapticStyle = "light", disableHaptics = false, onClick, ...props }, ref) => {
    const handleClick = async (e: MouseEvent<HTMLButtonElement>) => {
      // Trigger haptic feedback on native
      if (!disableHaptics && isNative()) {
        await haptics.impact(hapticStyle);
      }

      // Call original onClick handler
      onClick?.(e);
    };

    return <Button ref={ref} onClick={handleClick} {...props} />;
  }
);

HapticButton.displayName = "HapticButton";

/**
 * Wrapper to add haptic feedback to any interactive element
 */
export function withHaptics<T extends HTMLElement>(
  handler: (e: MouseEvent<T>) => void,
  style: HapticStyle = "light"
): (e: MouseEvent<T>) => void {
  return async (e: MouseEvent<T>) => {
    if (isNative()) {
      await haptics.impact(style);
    }
    handler(e);
  };
}

/**
 * Hook to trigger haptic feedback programmatically
 */
export function useHapticFeedback() {
  const triggerImpact = async (style: HapticStyle = "medium") => {
    if (isNative()) {
      await haptics.impact(style);
    }
  };

  const triggerNotification = async (type: "success" | "warning" | "error" = "success") => {
    if (isNative()) {
      await haptics.notification(type);
    }
  };

  const triggerSelection = async () => {
    if (isNative()) {
      await haptics.selection();
    }
  };

  return {
    impact: triggerImpact,
    notification: triggerNotification,
    selection: triggerSelection,
    isAvailable: isNative(),
  };
}
