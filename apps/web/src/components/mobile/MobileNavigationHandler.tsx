"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { isNative, getPlatform, haptics } from "@stewardtrack/native-bridge";

interface MobileNavigationHandlerProps {
  /** Callback when hardware back button is pressed. Return true to prevent default back behavior. */
  onBackPress?: () => boolean;
  /** Enable haptic feedback on navigation */
  enableHaptics?: boolean;
}

/**
 * MobileNavigationHandler
 *
 * Handles platform-specific navigation behaviors:
 * - Android hardware back button
 * - iOS swipe-to-go-back gesture integration
 * - Haptic feedback on navigation
 * - App state changes (background/foreground)
 */
export function MobileNavigationHandler({
  onBackPress,
  enableHaptics = true,
}: MobileNavigationHandlerProps) {
  const router = useRouter();

  // Handle Android back button
  const handleBackButton = useCallback(async () => {
    // Provide haptic feedback
    if (enableHaptics) {
      await haptics.impact("light");
    }

    // Check if custom handler wants to prevent default behavior
    if (onBackPress?.()) {
      return;
    }

    // Default behavior: navigate back
    router.back();
  }, [router, onBackPress, enableHaptics]);

  useEffect(() => {
    if (!isNative()) return;

    const platform = getPlatform();

    // Set up Android back button handler
    if (platform === "android") {
      const setupBackButton = async () => {
        try {
          const { App } = await import("@capacitor/app");

          // Listen for back button
          const listener = await App.addListener("backButton", ({ canGoBack }) => {
            if (canGoBack) {
              handleBackButton();
            } else {
              // At root - optionally minimize or exit app
              App.minimizeApp();
            }
          });

          return () => {
            listener.remove();
          };
        } catch (error) {
          console.error("Failed to set up back button handler:", error);
        }
      };

      const cleanup = setupBackButton();
      return () => {
        cleanup.then((fn) => fn?.());
      };
    }

    // iOS uses native gestures, no special handling needed
  }, [handleBackButton]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    if (!isNative()) return;

    const setupAppStateListener = async () => {
      try {
        const { App } = await import("@capacitor/app");

        const listener = await App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) {
            // App came to foreground
            document.dispatchEvent(new CustomEvent("app:foreground"));
          } else {
            // App went to background
            document.dispatchEvent(new CustomEvent("app:background"));
          }
        });

        return () => {
          listener.remove();
        };
      } catch (error) {
        console.error("Failed to set up app state listener:", error);
      }
    };

    const cleanup = setupAppStateListener();
    return () => {
      cleanup.then((fn) => fn?.());
    };
  }, []);

  // Handle URL open (deep links)
  useEffect(() => {
    if (!isNative()) return;

    const setupUrlListener = async () => {
      try {
        const { App } = await import("@capacitor/app");

        const listener = await App.addListener("appUrlOpen", ({ url }) => {
          // Parse the URL and navigate
          const parsedUrl = new URL(url);
          const path = parsedUrl.pathname;

          // Navigate to the deep link path
          if (path) {
            router.push(path);
          }
        });

        return () => {
          listener.remove();
        };
      } catch (error) {
        console.error("Failed to set up URL listener:", error);
      }
    };

    const cleanup = setupUrlListener();
    return () => {
      cleanup.then((fn) => fn?.());
    };
  }, [router]);

  // This component doesn't render anything
  return null;
}

/**
 * Hook to handle app lifecycle events
 */
export function useAppLifecycle(callbacks: {
  onForeground?: () => void;
  onBackground?: () => void;
}) {
  useEffect(() => {
    const handleForeground = () => callbacks.onForeground?.();
    const handleBackground = () => callbacks.onBackground?.();

    document.addEventListener("app:foreground", handleForeground);
    document.addEventListener("app:background", handleBackground);

    return () => {
      document.removeEventListener("app:foreground", handleForeground);
      document.removeEventListener("app:background", handleBackground);
    };
  }, [callbacks]);
}

/**
 * Navigate with haptic feedback
 */
export async function navigateWithHaptics(
  router: ReturnType<typeof useRouter>,
  path: string,
  hapticStyle: "light" | "medium" | "heavy" = "light"
) {
  if (isNative()) {
    await haptics.impact(hapticStyle);
  }
  router.push(path);
}
