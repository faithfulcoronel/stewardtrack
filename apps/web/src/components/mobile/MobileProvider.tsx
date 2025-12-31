"use client";

import { type ReactNode, useEffect, Suspense } from "react";
import { isNative, getPlatform } from "@stewardtrack/native-bridge";
import { MobileNavigationHandler } from "./MobileNavigationHandler";
import { StatusBarHandler, type StatusBarStyle } from "./StatusBarHandler";
import { KeyboardHandler } from "./KeyboardHandler";
import { NavigationProgress } from "./NavigationProgress";

interface MobileProviderProps {
  children: ReactNode;
  /** Status bar style */
  statusBarStyle?: StatusBarStyle;
  /** Status bar background color (Android) */
  statusBarBackgroundColor?: string;
  /** Enable haptic feedback on navigation */
  enableHaptics?: boolean;
  /** Adjust body padding when keyboard appears */
  adjustBodyForKeyboard?: boolean;
  /** Show navigation progress indicator */
  showNavigationProgress?: boolean;
  /** Navigation progress bar color */
  progressColor?: string;
}

/**
 * MobileProvider
 *
 * A convenience wrapper that sets up all mobile platform integrations:
 * - Status bar configuration
 * - Navigation handling (back button, deep links)
 * - Keyboard handling
 * - Splash screen management
 *
 * Place this at the root of your app (typically in layout.tsx).
 */
export function MobileProvider({
  children,
  statusBarStyle = "dark",
  statusBarBackgroundColor = "#ffffff",
  enableHaptics = true,
  adjustBodyForKeyboard = true,
  showNavigationProgress = true,
  progressColor,
}: MobileProviderProps) {
  // Hide splash screen when app is ready
  useEffect(() => {
    if (!isNative()) return;

    const hideSplashScreen = async () => {
      try {
        const { SplashScreen } = await import("@capacitor/splash-screen");
        // Wait a brief moment for the app to render
        await new Promise((resolve) => setTimeout(resolve, 300));
        await SplashScreen.hide({ fadeOutDuration: 500 });
      } catch (error) {
        console.error("Failed to hide splash screen:", error);
      }
    };

    hideSplashScreen();
  }, []);

  // Apply mobile-specific CSS classes to body
  useEffect(() => {
    if (typeof document === "undefined") return;

    const platform = getPlatform();
    const native = isNative();

    document.body.classList.toggle("platform-ios", platform === "ios");
    document.body.classList.toggle("platform-android", platform === "android");
    document.body.classList.toggle("platform-web", platform === "web");
    document.body.classList.toggle("is-native", native);

    // Apply touch-action for better mobile scrolling
    if (native) {
      document.documentElement.style.setProperty("touch-action", "manipulation");
      // Prevent overscroll bounce on iOS
      document.body.style.overscrollBehavior = "none";
    }

    return () => {
      document.body.classList.remove(
        "platform-ios",
        "platform-android",
        "platform-web",
        "is-native"
      );
    };
  }, []);

  return (
    <>
      {/* Navigation progress indicator */}
      {showNavigationProgress && (
        <Suspense fallback={null}>
          <NavigationProgress color={progressColor} />
        </Suspense>
      )}

      {/* Status bar configuration */}
      <StatusBarHandler
        style={statusBarStyle}
        backgroundColor={statusBarBackgroundColor}
        overlaysWebView={true}
      />

      {/* Navigation handling */}
      <MobileNavigationHandler enableHaptics={enableHaptics} />

      {/* Keyboard handling */}
      <KeyboardHandler adjustBodyPadding={adjustBodyForKeyboard} />

      {children}
    </>
  );
}

/**
 * CSS styles for mobile platforms
 *
 * Add these to your global CSS file:
 *
 * ```css
 * // Safe area CSS custom properties
 * :root {
 *   --safe-area-top: env(safe-area-inset-top, 0px);
 *   --safe-area-bottom: env(safe-area-inset-bottom, 0px);
 *   --safe-area-left: env(safe-area-inset-left, 0px);
 *   --safe-area-right: env(safe-area-inset-right, 0px);
 * }
 *
 * // Platform-specific styles
 * .is-native {
 *   // Improve touch targets
 *   button, a, [role="button"] {
 *     min-height: 44px;
 *     min-width: 44px;
 *   }
 *
 *   // Better scrolling on mobile
 *   -webkit-overflow-scrolling: touch;
 * }
 *
 * .platform-ios {
 *   // iOS-specific styles
 *   padding-top: var(--safe-area-top);
 *   padding-bottom: var(--safe-area-bottom);
 * }
 *
 * .platform-android {
 *   // Android-specific styles
 * }
 * ```
 */
