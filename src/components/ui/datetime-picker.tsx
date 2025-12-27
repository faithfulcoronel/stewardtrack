"use client";

import * as React from "react";
import { CalendarIcon, Clock } from "lucide-react";
import { format, isValid, parseISO, setHours, setMinutes } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "./calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DateTimePickerProps {
  value?: Date | string | null;
  onChange?: (value: Date | undefined) => void;
  placeholder?: string;
  title?: string;
  description?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  mobileBreakpoint?: string;
  clearable?: boolean;
  clearLabel?: string;
}

function parseValue(value: Date | string | null | undefined): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) {
    return isValid(value) ? value : undefined;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;

    // Try ISO format first
    const parsed = parseISO(trimmed);
    if (isValid(parsed)) return parsed;

    // Try standard Date parsing
    const timestamp = Date.parse(trimmed);
    if (!Number.isNaN(timestamp)) {
      const candidate = new Date(timestamp);
      return isValid(candidate) ? candidate : undefined;
    }
  }
  return undefined;
}

function formatDateTime(date: Date | undefined): string {
  if (!date || !isValid(date)) return "";
  return format(date, "LLL d, yyyy 'at' h:mm a");
}

function DateTimePicker({
  value,
  onChange,
  placeholder = "Select date & time",
  title = "Select date & time",
  description,
  disabled = false,
  minDate,
  maxDate,
  className,
  mobileBreakpoint = "(min-width: 768px)",
  clearable = true,
  clearLabel = "Clear",
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [isDesktop, setIsDesktop] = React.useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(mobileBreakpoint).matches;
  });

  const selectedDate = React.useMemo(() => parseValue(value), [value]);

  const [tempDate, setTempDate] = React.useState<Date | undefined>(selectedDate);
  const [hours, setHoursState] = React.useState(() =>
    selectedDate ? selectedDate.getHours().toString().padStart(2, "0") : "09"
  );
  const [minutes, setMinutesState] = React.useState(() =>
    selectedDate ? selectedDate.getMinutes().toString().padStart(2, "0") : "00"
  );

  // Sync with external value changes
  React.useEffect(() => {
    const parsed = parseValue(value);
    setTempDate(parsed);
    if (parsed) {
      setHoursState(parsed.getHours().toString().padStart(2, "0"));
      setMinutesState(parsed.getMinutes().toString().padStart(2, "0"));
    }
  }, [value]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const query = window.matchMedia(mobileBreakpoint);
    const update = (event: MediaQueryList | MediaQueryListEvent) => {
      setIsDesktop(event.matches);
    };

    update(query);

    if (typeof query.addEventListener === "function") {
      const listener = (event: MediaQueryListEvent) => update(event);
      query.addEventListener("change", listener);
      return () => query.removeEventListener("change", listener);
    }

    return undefined;
  }, [mobileBreakpoint]);

  const isMobile = !isDesktop;

  const handleDateSelect = React.useCallback((date: Date | undefined) => {
    if (!date) {
      setTempDate(undefined);
      return;
    }

    // Preserve the time when selecting a new date
    const h = parseInt(hours, 10) || 0;
    const m = parseInt(minutes, 10) || 0;
    const newDate = setMinutes(setHours(date, h), m);
    setTempDate(newDate);
  }, [hours, minutes]);

  const handleTimeChange = React.useCallback((type: "hours" | "minutes", newValue: string) => {
    const sanitized = newValue.replace(/\D/g, "").slice(0, 2);

    if (type === "hours") {
      const h = Math.min(23, Math.max(0, parseInt(sanitized, 10) || 0));
      setHoursState(sanitized || "00");
      if (tempDate) {
        setTempDate(setHours(tempDate, h));
      }
    } else {
      const m = Math.min(59, Math.max(0, parseInt(sanitized, 10) || 0));
      setMinutesState(sanitized || "00");
      if (tempDate) {
        setTempDate(setMinutes(tempDate, m));
      }
    }
  }, [tempDate]);

  const handleConfirm = React.useCallback(() => {
    if (tempDate) {
      const h = parseInt(hours, 10) || 0;
      const m = parseInt(minutes, 10) || 0;
      const finalDate = setMinutes(setHours(tempDate, h), m);
      onChange?.(finalDate);
    } else {
      onChange?.(undefined);
    }
    setOpen(false);
  }, [tempDate, hours, minutes, onChange]);

  const handleClear = React.useCallback(() => {
    setTempDate(undefined);
    setHoursState("09");
    setMinutesState("00");
    onChange?.(undefined);
  }, [onChange]);

  const displayValue = selectedDate ? formatDateTime(selectedDate) : placeholder;
  const hasSelection = Boolean(selectedDate);

  const triggerButton = (
    <Button
      type="button"
      variant="outline"
      disabled={disabled}
      className={cn(
        "h-10 w-full justify-start gap-2 text-left font-medium",
        !hasSelection && "text-muted-foreground"
      )}
    >
      <CalendarIcon className="size-4 text-muted-foreground" />
      <span className="flex-1 truncate">{displayValue}</span>
    </Button>
  );

  const pickerContent = (
    <div className="space-y-4">
      {/* Calendar */}
      <Calendar
        mode="single"
        selected={tempDate}
        onSelect={handleDateSelect}
        disabled={(date) => {
          if (minDate && date < minDate) return true;
          if (maxDate && date > maxDate) return true;
          return false;
        }}
        className="mx-auto"
      />

      {/* Time picker */}
      <div className="border-t border-border/60 pt-4">
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Time
        </Label>
        <div className="mt-2 flex items-center gap-2">
          <Clock className="size-4 text-muted-foreground" />
          <div className="flex items-center gap-1">
            <Input
              type="text"
              inputMode="numeric"
              value={hours}
              onChange={(e) => handleTimeChange("hours", e.target.value)}
              onBlur={() => setHoursState(hours.padStart(2, "0"))}
              placeholder="HH"
              className="h-9 w-14 text-center"
              maxLength={2}
            />
            <span className="text-muted-foreground font-medium">:</span>
            <Input
              type="text"
              inputMode="numeric"
              value={minutes}
              onChange={(e) => handleTimeChange("minutes", e.target.value)}
              onBlur={() => setMinutesState(minutes.padStart(2, "0"))}
              placeholder="MM"
              className="h-9 w-14 text-center"
              maxLength={2}
            />
          </div>
          <span className="text-sm text-muted-foreground ml-2">
            (24-hour format)
          </span>
        </div>
      </div>

      {/* Quick time presets */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "9:00 AM", h: 9, m: 0 },
          { label: "12:00 PM", h: 12, m: 0 },
          { label: "3:00 PM", h: 15, m: 0 },
          { label: "6:00 PM", h: 18, m: 0 },
          { label: "7:30 PM", h: 19, m: 30 },
        ].map((preset) => (
          <Button
            key={preset.label}
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full text-xs"
            onClick={() => {
              setHoursState(preset.h.toString().padStart(2, "0"));
              setMinutesState(preset.m.toString().padStart(2, "0"));
              if (tempDate) {
                setTempDate(setMinutes(setHours(tempDate, preset.h), preset.m));
              }
            }}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-border/60 pt-4">
        <div>
          {clearable && hasSelection && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
            >
              {clearLabel}
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={!tempDate}
          >
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );

  const desktopView = (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
      <PopoverContent align="start" sideOffset={8} className="w-auto p-4">
        {pickerContent}
      </PopoverContent>
    </Popover>
  );

  const mobileView = (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="space-y-2 border-b px-6 pb-4 pt-6 text-left">
          <DrawerTitle>{title}</DrawerTitle>
          {description && <DrawerDescription>{description}</DrawerDescription>}
        </DrawerHeader>
        <div className="px-4 pb-6 pt-4 overflow-y-auto">
          {pickerContent}
        </div>
      </DrawerContent>
    </Drawer>
  );

  return (
    <div className={cn("w-full", className)}>
      {isMobile ? mobileView : desktopView}
    </div>
  );
}

export { DateTimePicker };
export type { DateTimePickerProps };
