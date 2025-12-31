"use client";

import { useMemo } from "react";

import { useTheme } from "./theme-provider";
import { cn } from "@/lib/utils";

const MODE_OPTIONS = [
  { id: "light" as const, label: "Light" },
  { id: "dark" as const, label: "Dark" },
  { id: "system" as const, label: "System" },
];

export function ThemeModeToggle() {
  const { mode, setMode, resolvedMode, mounted } = useTheme();
  const active = mounted ? mode : "system";
  const displayResolved = useMemo(() => (resolvedMode ?? "light"), [resolvedMode]);

  return (
    <div className="flex items-center gap-1.5">
      {MODE_OPTIONS.map((option) => {
        const isActive = active === option.id;
        const ariaLabel =
          option.id === "system" ? `Use system theme (currently ${displayResolved})` : `Switch to ${option.label} theme`;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setMode(option.id)}
            aria-label={ariaLabel}
            aria-pressed={isActive}
            className={cn(
              "inline-flex items-center rounded-full border border-border/60 px-3 py-1 text-xs font-medium transition",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:bg-muted/70",
            )}
          >
            {option.id === "system" && isActive ? `${option.label} (${displayResolved})` : option.label}
          </button>
        );
      })}
    </div>
  );
}
