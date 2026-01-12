"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes";

import {
  DEFAULT_THEME_ID,
  THEMES,
  THEME_MODE_STORAGE_KEY,
  THEME_PALETTE_STORAGE_KEY,
  type ThemeId,
  type ThemeMode,
} from "@/lib/themes";

function isThemeId(value: string | null): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}

type ThemeContextValue = {
  palettes: typeof THEMES;
  palette: ThemeId;
  setPalette: (palette: ThemeId) => void;
  mode: ThemeMode | "system";
  setMode: (mode: ThemeMode | "system") => void;
  resolvedMode: ThemeMode;
  mounted: boolean;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-mode"
      defaultTheme="system"
      enableSystem
      storageKey={THEME_MODE_STORAGE_KEY}
      disableTransitionOnChange
      themes={["light", "dark"]}
    >
      <ThemeBridge>{children}</ThemeBridge>
    </NextThemesProvider>
  );
}

function ThemeBridge({ children }: { children: React.ReactNode }) {
  const { resolvedTheme, setTheme: setModeInternal, theme: currentMode } = useNextTheme();
  const [palette, setPaletteState] = useState<ThemeId>(DEFAULT_THEME_ID);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(THEME_PALETTE_STORAGE_KEY);
    if (isThemeId(stored)) {
      setPaletteState(stored);
    }
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    window.localStorage.setItem(THEME_PALETTE_STORAGE_KEY, palette);
  }, [palette, mounted]);

  const mode = (currentMode as ThemeMode | "system") ?? "system";
  const resolvedMode = (resolvedTheme ?? "light") as ThemeMode;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = window.document.documentElement;
    const body = window.document.body;

    root.dataset.theme = palette;
    root.dataset.themePalette = palette;
    root.dataset.themeMode = resolvedMode;
    root.style.colorScheme = resolvedMode;
    body?.classList.toggle("dark", resolvedMode === "dark");
  }, [palette, resolvedMode]);

  const handleSetPalette = useCallback((next: ThemeId) => {
    setPaletteState((current) => (current === next ? current : next));
  }, []);

  const handleSetMode = useCallback(
    (next: ThemeMode | "system") => {
      setModeInternal(next);
    },
    [setModeInternal],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      palettes: THEMES,
      palette,
      setPalette: handleSetPalette,
      mode,
      setMode: handleSetMode,
      resolvedMode,
      mounted,
    }),
    [palette, handleSetPalette, mode, handleSetMode, resolvedMode, mounted],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

const defaultThemeValue: ThemeContextValue = {
  palettes: THEMES,
  palette: DEFAULT_THEME_ID,
  setPalette: () => {},
  mode: "system",
  setMode: () => {},
  resolvedMode: "light",
  mounted: false,
};

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  // Return default value during SSR or before ThemeProvider mounts
  // This prevents errors during hydration and server-side rendering
  if (!context) {
    return defaultThemeValue;
  }

  return context;
}
