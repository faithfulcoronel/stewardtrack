"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Palette, Sparkles, Sun, Moon, MonitorCog, GripVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTheme } from "./theme-provider";
import { DEFAULT_THEME_ID } from "@/lib/themes";
import { cn } from "@/lib/utils";

// Pages where theme floater should be hidden
const HIDDEN_PATHS = ["/", "/login", "/signup", "/signup/register"];

const modes = [
  { id: "light" as const, label: "Light", icon: Sun },
  { id: "dark" as const, label: "Dark", icon: Moon },
  { id: "system" as const, label: "System", icon: MonitorCog },
];

const STORAGE_KEY = "theme-floater-position";
const DEFAULT_POSITION = { x: 24, y: 24 }; // bottom-right with 24px margin
const DRAG_THRESHOLD = 5; // pixels to move before considered a drag

interface Position {
  x: number;
  y: number;
}

function getStoredPosition(): Position | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (typeof parsed.x === "number" && typeof parsed.y === "number") {
        return parsed;
      }
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

function storePosition(position: Position) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
  } catch {
    // Ignore storage errors
  }
}

export function ThemeFloater() {
  const pathname = usePathname();
  const { palettes, palette, setPalette, mode, setMode, resolvedMode, mounted } = useTheme();
  const activePalette = mounted ? palette : DEFAULT_THEME_ID;
  const activeMode = mounted ? mode : "system";
  const resolved = mounted ? resolvedMode : "light";

  // Hide on public/landing pages
  const isHiddenPath = HIDDEN_PATHS.some(path =>
    pathname === path || pathname?.startsWith("/signup/")
  );

  if (isHiddenPath) {
    return null;
  }

  // Draggable state - position is relative to bottom-right corner
  const [position, setPosition] = useState<Position>(DEFAULT_POSITION);
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Load stored position on mount
  useEffect(() => {
    const stored = getStoredPosition();
    if (stored) {
      // Validate position is still within viewport
      const maxX = window.innerWidth - 56; // button width
      const maxY = window.innerHeight - 56; // button height
      setPosition({
        x: Math.min(Math.max(stored.x, 16), maxX),
        y: Math.min(Math.max(stored.y, 16), maxY),
      });
    }
  }, []);

  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      posX: position.x,
      posY: position.y,
    };
    setHasDragged(false);
  }, [position]);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!dragStartRef.current) return;

    const deltaX = dragStartRef.current.x - clientX;
    const deltaY = dragStartRef.current.y - clientY;

    // Check if we've moved enough to be considered dragging
    if (!isDragging && (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD)) {
      setIsDragging(true);
      setHasDragged(true);
    }

    if (isDragging || Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD) {
      const newX = dragStartRef.current.posX + deltaX;
      const newY = dragStartRef.current.posY + deltaY;

      // Constrain to viewport with padding
      const maxX = window.innerWidth - 56;
      const maxY = window.innerHeight - 56;

      setPosition({
        x: Math.min(Math.max(newX, 16), maxX),
        y: Math.min(Math.max(newY, 16), maxY),
      });
    }
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    if (isDragging) {
      storePosition(position);
    }
    dragStartRef.current = null;
    setIsDragging(false);
  }, [isDragging, position]);

  // Mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    e.preventDefault();
    handleDragStart(e.clientX, e.clientY);

    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      handleDragEnd();
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }, [handleDragStart, handleDragMove, handleDragEnd]);

  // Touch events for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    handleDragStart(touch.clientX, touch.clientY);
  }, [handleDragStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    handleDragMove(touch.clientX, touch.clientY);
    if (isDragging) {
      e.preventDefault(); // Prevent scroll while dragging
    }
  }, [handleDragMove, isDragging]);

  const handleTouchEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Get the current mode icon for the button
  const CurrentModeIcon = modes.find(m => m.id === activeMode)?.icon ?? Palette;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          ref={buttonRef}
          size="icon"
          variant="outline"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={(e) => {
            // Prevent popover from opening if we just dragged
            if (hasDragged) {
              e.preventDefault();
              e.stopPropagation();
              setHasDragged(false);
            }
          }}
          className={cn(
            "fixed z-[60] rounded-full border-border/60 bg-background/95 shadow-lg shadow-black/10 backdrop-blur transition-shadow",
            // Mobile-first: larger touch target on mobile
            "h-14 w-14 sm:h-12 sm:w-12",
            // Hover and drag states
            isDragging ? "cursor-grabbing shadow-xl scale-105" : "cursor-grab hover:shadow-xl hover:border-primary/40",
            // Active palette gradient ring
            "ring-2 ring-offset-2 ring-offset-background"
          )}
          style={{
            right: position.x,
            bottom: position.y,
            // Apply active palette gradient as ring color
            ["--tw-ring-color" as string]: palettes.find(p => p.id === activePalette)?.preview[0] ?? "hsl(var(--primary))",
          }}
          aria-label="Theme settings (drag to reposition)"
        >
          <div className="relative flex items-center justify-center">
            <CurrentModeIcon className="size-5 sm:size-4" />
            {isDragging && (
              <GripVertical className="absolute -right-1 -top-1 size-3 text-muted-foreground animate-pulse" />
            )}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        sideOffset={12}
        align="end"
        side="top"
        className="w-52 rounded-2xl border-border/60 bg-background/95 p-4 backdrop-blur sm:w-48 sm:p-3"
      >
        {/* Header */}
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
          <Palette className="size-4" />
          <span>Theme Settings</span>
        </div>

        {/* Mode selector */}
        <div className="mb-3">
          <span className="mb-2 block text-xs text-muted-foreground">Mode</span>
          <div className="flex items-center justify-center gap-2">
            {modes.map((entry) => {
              const Icon = entry.icon;
              const isActive = activeMode === entry.id;
              const tooltip =
                entry.id === "system"
                  ? `System (${resolved})`
                  : entry.label;

              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setMode(entry.id)}
                  aria-pressed={isActive}
                  aria-label={tooltip}
                  className={cn(
                    // Mobile-first: larger touch targets, icon-only
                    "flex size-11 items-center justify-center rounded-full border border-border/60 transition sm:size-9",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "active:scale-95",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted/80",
                  )}
                  title={tooltip}
                >
                  <Icon className="size-5 sm:size-4" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Palette selector */}
        <div>
          <span className="mb-2 block text-xs text-muted-foreground">Color palette</span>
          <div className="grid grid-cols-4 gap-2">
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
                    // Mobile-first: larger touch targets
                    "group relative flex h-12 items-center justify-center rounded-xl border border-border/60 transition sm:h-10",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "active:scale-95",
                    isActive ? "ring-2 ring-ring ring-offset-2" : "hover:border-border hover:scale-105",
                  )}
                  title={option.label}
                >
                  <span
                    className="absolute inset-0 rounded-xl"
                    style={{
                      backgroundImage: `linear-gradient(135deg, ${option.preview[0]}, ${option.preview[1]})`,
                    }}
                  />
                  <Sparkles className="relative size-4 text-white drop-shadow-sm opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Drag hint */}
        <div className="mt-3 flex items-center justify-center gap-1 text-[10px] text-muted-foreground/60">
          <GripVertical className="size-3" />
          <span>Drag button to reposition</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
