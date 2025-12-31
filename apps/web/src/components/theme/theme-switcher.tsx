"use client";

import { useMemo } from "react";

import { useTheme } from "./theme-provider";
import { cn } from "@/lib/utils";
import { DEFAULT_THEME_ID } from "@/lib/themes";

export function ThemeSwitcher() {
  const { palettes, palette, setPalette, mounted } = useTheme();

  const options = useMemo(() => palettes, [palettes]);
  const activePalette = mounted ? palette : DEFAULT_THEME_ID;

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs font-medium text-muted-foreground sm:inline">Theme</span>
      <div className="flex items-center gap-1.5">
        {options.map((option) => {
          const isActive = option.id === activePalette;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setPalette(option.id)}
              aria-label={`Activate ${option.label} theme`}
              aria-pressed={isActive}
              title={option.label}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isActive ? "ring-2 ring-ring ring-offset-2" : "opacity-85 hover:opacity-100",
              )}
              style={{
                backgroundImage: `linear-gradient(135deg, ${option.preview[0]}, ${option.preview[1]})`,
              }}
            >
              <span className="sr-only">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
