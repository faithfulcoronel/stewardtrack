"use client";

import { useEffect, useState, type ReactNode } from "react";
import { isNative, getPlatform } from "@stewardtrack/native-bridge";

interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface MobileLayoutWrapperProps {
  children: ReactNode;
  /** Apply safe area padding to content */
  useSafeArea?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * MobileLayoutWrapper
 *
 * Handles safe area insets for notched devices (iPhone X+, Android with notches).
 * Uses CSS env() variables with fallback to Capacitor SafeArea plugin values.
 *
 * On web, this component is a simple pass-through wrapper.
 * On native, it applies appropriate padding for device notches and home indicators.
 */
export function MobileLayoutWrapper({
  children,
  useSafeArea = true,
  className = "",
}: MobileLayoutWrapperProps) {
  const [insets, setInsets] = useState<SafeAreaInsets>({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });
  const [isNativePlatform, setIsNativePlatform] = useState(false);
  const [platform, setPlatform] = useState<"web" | "ios" | "android">("web");

  useEffect(() => {
    const native = isNative();
    setIsNativePlatform(native);
    setPlatform(getPlatform());

    if (native) {
      // Try to get safe area insets from Capacitor SafeArea plugin
      // or fall back to CSS env() variables
      getSafeAreaInsets().then(setInsets);

      // Listen for orientation changes to update insets
      const handleResize = () => {
        getSafeAreaInsets().then(setInsets);
      };

      window.addEventListener("resize", handleResize);
      window.addEventListener("orientationchange", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("orientationchange", handleResize);
      };
    }
  }, []);

  // Generate CSS custom properties for safe area insets
  const safeAreaStyle = useSafeArea
    ? {
        "--safe-area-top": `${insets.top}px`,
        "--safe-area-bottom": `${insets.bottom}px`,
        "--safe-area-left": `${insets.left}px`,
        "--safe-area-right": `${insets.right}px`,
        paddingTop: `max(${insets.top}px, env(safe-area-inset-top, 0px))`,
        paddingBottom: `max(${insets.bottom}px, env(safe-area-inset-bottom, 0px))`,
        paddingLeft: `max(${insets.left}px, env(safe-area-inset-left, 0px))`,
        paddingRight: `max(${insets.right}px, env(safe-area-inset-right, 0px))`,
      }
    : {};

  return (
    <div
      className={`mobile-layout-wrapper ${className}`}
      style={safeAreaStyle as React.CSSProperties}
      data-platform={platform}
      data-native={isNativePlatform}
    >
      {children}
    </div>
  );
}

/**
 * Get safe area insets from various sources
 */
async function getSafeAreaInsets(): Promise<SafeAreaInsets> {
  // First, try to get from CSS env() via computed style
  if (typeof window !== "undefined") {
    const testEl = document.createElement("div");
    testEl.style.paddingTop = "env(safe-area-inset-top, 0px)";
    testEl.style.paddingBottom = "env(safe-area-inset-bottom, 0px)";
    testEl.style.paddingLeft = "env(safe-area-inset-left, 0px)";
    testEl.style.paddingRight = "env(safe-area-inset-right, 0px)";
    testEl.style.position = "fixed";
    testEl.style.visibility = "hidden";
    document.body.appendChild(testEl);

    const computed = window.getComputedStyle(testEl);
    const insets = {
      top: parseInt(computed.paddingTop, 10) || 0,
      bottom: parseInt(computed.paddingBottom, 10) || 0,
      left: parseInt(computed.paddingLeft, 10) || 0,
      right: parseInt(computed.paddingRight, 10) || 0,
    };

    document.body.removeChild(testEl);

    // If we got valid values, use them
    if (insets.top > 0 || insets.bottom > 0) {
      return insets;
    }
  }

  // Default fallback for common devices
  const platform = getPlatform();
  if (platform === "ios") {
    // iPhone with notch default values
    return { top: 47, bottom: 34, left: 0, right: 0 };
  } else if (platform === "android") {
    // Android with status bar
    return { top: 24, bottom: 0, left: 0, right: 0 };
  }

  return { top: 0, bottom: 0, left: 0, right: 0 };
}

/**
 * Hook to get current safe area insets
 */
export function useSafeAreaInsets(): SafeAreaInsets {
  const [insets, setInsets] = useState<SafeAreaInsets>({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });

  useEffect(() => {
    if (isNative()) {
      getSafeAreaInsets().then(setInsets);
    }
  }, []);

  return insets;
}

/**
 * Hook to check if running on native platform
 */
export function useIsNative(): boolean {
  const [native, setNative] = useState(false);

  useEffect(() => {
    setNative(isNative());
  }, []);

  return native;
}

/**
 * Hook to get current platform
 */
export function usePlatform(): "web" | "ios" | "android" {
  const [platform, setPlatform] = useState<"web" | "ios" | "android">("web");

  useEffect(() => {
    setPlatform(getPlatform());
  }, []);

  return platform;
}
