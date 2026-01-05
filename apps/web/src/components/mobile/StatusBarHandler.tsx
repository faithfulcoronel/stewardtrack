"use client";

import { useEffect } from "react";
import { isNative, getPlatform } from "@stewardtrack/native-bridge";

export type StatusBarStyle = "dark" | "light";

interface StatusBarHandlerProps {
  /** Status bar style - 'dark' has dark text, 'light' has light text */
  style?: StatusBarStyle;
  /** Background color for the status bar (Android only) */
  backgroundColor?: string;
  /** Whether the status bar should overlay the content */
  overlaysWebView?: boolean;
}

/**
 * StatusBarHandler
 *
 * Manages the native status bar appearance on iOS and Android.
 * Uses Capacitor StatusBar plugin when available.
 */
export function StatusBarHandler({
  style = "dark",
  backgroundColor = "#ffffff",
  overlaysWebView = false,
}: StatusBarHandlerProps) {
  useEffect(() => {
    if (!isNative()) return;

    const configureStatusBar = async () => {
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        const platform = getPlatform();

        // Set status bar style
        await StatusBar.setStyle({
          style: style === "dark" ? Style.Dark : Style.Light,
        });

        // Android-specific: set background color
        if (platform === "android") {
          await StatusBar.setBackgroundColor({ color: backgroundColor });
        }

        // Set overlay mode
        await StatusBar.setOverlaysWebView({ overlay: overlaysWebView });
      } catch (error) {
        console.error("Failed to configure status bar:", error);
      }
    };

    configureStatusBar();
  }, [style, backgroundColor, overlaysWebView]);

  return null;
}

/**
 * Hook to control status bar programmatically
 */
export function useStatusBar() {
  const setStyle = async (style: StatusBarStyle) => {
    if (!isNative()) return;

    try {
      const { StatusBar, Style } = await import("@capacitor/status-bar");
      await StatusBar.setStyle({
        style: style === "dark" ? Style.Dark : Style.Light,
      });
    } catch (error) {
      console.error("Failed to set status bar style:", error);
    }
  };

  const setBackgroundColor = async (color: string) => {
    if (!isNative() || getPlatform() !== "android") return;

    try {
      const { StatusBar } = await import("@capacitor/status-bar");
      await StatusBar.setBackgroundColor({ color });
    } catch (error) {
      console.error("Failed to set status bar background:", error);
    }
  };

  const show = async () => {
    if (!isNative()) return;

    try {
      const { StatusBar } = await import("@capacitor/status-bar");
      await StatusBar.show();
    } catch (error) {
      console.error("Failed to show status bar:", error);
    }
  };

  const hide = async () => {
    if (!isNative()) return;

    try {
      const { StatusBar } = await import("@capacitor/status-bar");
      await StatusBar.hide();
    } catch (error) {
      console.error("Failed to hide status bar:", error);
    }
  };

  return {
    setStyle,
    setBackgroundColor,
    show,
    hide,
  };
}
