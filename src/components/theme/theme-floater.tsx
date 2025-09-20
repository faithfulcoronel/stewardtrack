"use client";

import { Menu, Sparkles, Sun, Moon, MonitorCog } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTheme } from "./theme-provider";
import { DEFAULT_THEME_ID } from "@/lib/themes";
import { cn } from "@/lib/utils";

const modes = [
  { id: "light" as const, label: "Light", icon: Sun },
  { id: "dark" as const, label: "Dark", icon: Moon },
  { id: "system" as const, label: "System", icon: MonitorCog },
];

export function ThemeFloater() {
  const { palettes, palette, setPalette, mode, setMode, resolvedMode, mounted } = useTheme();
  const activePalette = mounted ? palette : DEFAULT_THEME_ID;
  const activeMode = mounted ? mode : "system";
  const resolved = mounted ? resolvedMode : "light";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          className="fixed bottom-6 right-6 z-[60] h-12 w-12 rounded-full border-border/60 bg-background/95 shadow-lg shadow-[rgba(15,23,42,0.18)] backdrop-blur"
        >
          <Menu className="size-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        sideOffset={12}
        align="end"
        className="w-48 rounded-2xl border-border/60 bg-background/95 p-3 backdrop-blur"
      >
        <div className="flex items-center justify-end gap-2 text-muted-foreground">
          {modes.map((entry) => {
            const Icon = entry.icon;
            const isActive = activeMode === entry.id;
            const tooltip =
              entry.id === "system"
                ? `Use system mode (currently ${resolved})`
                : `Switch to ${entry.label} mode`;

            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => setMode(entry.id)}
                aria-pressed={isActive}
                aria-label={tooltip}
                className={cn(
                  "flex size-9 items-center justify-center rounded-full border border-border/60 transition",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isActive ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted/80",
                )}
                title={tooltip}
              >
                <Icon className="size-4" />
              </button>
            );
          })}
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {palettes.map((option) => {
            const isActive = option.id === activePalette;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setPalette(option.id)}
                aria-pressed={isActive}
                aria-label={`Activate ${option.label} theme`}
                className={cn(
                  "group relative flex h-10 items-center justify-center rounded-xl border border-border/60 transition",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isActive ? "ring-2 ring-ring ring-offset-2" : "hover:border-border",
                )}
                title={option.label}
              >
                <span
                  className="absolute inset-0 rounded-xl"
                  style={{
                    backgroundImage: `linear-gradient(135deg, ${option.preview[0]}, ${option.preview[1]})`,
                  }}
                />
                <Sparkles className="relative size-4 text-background opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
