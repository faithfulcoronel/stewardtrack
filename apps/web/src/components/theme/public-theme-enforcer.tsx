"use client";

import { useEffect } from "react";
import { DEFAULT_THEME_ID } from "@/lib/themes";

/**
 * PublicThemeEnforcer
 *
 * Forces the default light theme on public pages (landing, login, signup, donate).
 * This ensures consistent branding regardless of user's stored theme preferences.
 *
 * This component works together with the "public-theme-fixed" CSS class to:
 * 1. Set the correct data attributes on the html element
 * 2. Remove dark mode classes
 * 3. Force light color scheme
 */
export function PublicThemeEnforcer() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = window.document.documentElement;
    const body = window.document.body;

    // Force default palette and light mode for public pages
    root.dataset.theme = DEFAULT_THEME_ID;
    root.dataset.themePalette = DEFAULT_THEME_ID;
    root.dataset.themeMode = "light";
    root.dataset.mode = "light";
    root.style.colorScheme = "light";

    // Remove dark mode classes
    root.classList.remove("dark");
    body?.classList.remove("dark");

    // Cleanup function to restore when navigating away
    return () => {
      // Theme will be restored by ThemeProvider when navigating to non-public pages
    };
  }, []);

  return null;
}
