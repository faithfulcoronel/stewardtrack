"use client";

import * as React from "react";
import { format, isValid, parseISO, setHours, setMinutes, addMinutes } from "date-fns";
import { Calendar, Clock, Globe, Repeat } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Generate time options in 15-minute intervals
function generateTimeOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const h = hour.toString().padStart(2, "0");
      const m = minute.toString().padStart(2, "0");
      const value = `${h}:${m}`;

      // Format as 12-hour time for display
      const period = hour >= 12 ? "PM" : "AM";
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const label = `${displayHour}:${m.padStart(2, "0")} ${period}`;

      options.push({ value, label });
    }
  }
  return options;
}

const TIME_OPTIONS = generateTimeOptions();

// Validate time string format (HH:mm)
function isValidTimeFormat(time: string): boolean {
  if (!time) return false;
  const regex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
  return regex.test(time);
}

// Parse time string to hours and minutes
function parseTime(time: string): { hours: number; minutes: number } | null {
  if (!isValidTimeFormat(time)) return null;
  const [hours, minutes] = time.split(":").map(Number);
  return { hours, minutes };
}

// Format time to display string (e.g., "5:00 PM")
function formatTimeDisplay(time: string): string {
  const parsed = parseTime(time);
  if (!parsed) return time;

  const { hours, minutes } = parsed;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHour}:${minutes.toString().padStart(2, "0")} ${period}`;
}

// Normalize time to HH:mm format
function normalizeTime(time: string): string {
  const parsed = parseTime(time);
  if (!parsed) return "";
  return `${parsed.hours.toString().padStart(2, "0")}:${parsed.minutes.toString().padStart(2, "0")}`;
}

// Calculate end time based on start time and duration
function calculateEndTime(startTime: string, durationMinutes: number): string {
  const parsed = parseTime(startTime);
  if (!parsed) return "";

  const date = new Date(2000, 0, 1, parsed.hours, parsed.minutes);
  const endDate = addMinutes(date, durationMinutes);

  return `${endDate.getHours().toString().padStart(2, "0")}:${endDate.getMinutes().toString().padStart(2, "0")}`;
}

// Calculate duration in minutes between two times
function calculateDuration(startTime: string, endTime: string): number {
  const start = parseTime(startTime);
  const end = parseTime(endTime);

  if (!start || !end) return 60;

  const startMinutes = start.hours * 60 + start.minutes;
  let endMinutes = end.hours * 60 + end.minutes;

  // Handle crossing midnight
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }

  return endMinutes - startMinutes;
}

export interface DateTimeRangeValue {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  isAllDay: boolean;
  timezone?: string;
}

interface DateTimeRangePickerProps {
  value?: DateTimeRangeValue;
  onChange: (value: DateTimeRangeValue) => void;
  showRecurring?: boolean;
  onRecurringClick?: () => void;
  isRecurring?: boolean;
  disabled?: boolean;
  className?: string;
  minDate?: Date;
  defaultDuration?: number; // in minutes
}

export function DateTimeRangePicker({
  value,
  onChange,
  showRecurring = true,
  onRecurringClick,
  isRecurring = false,
  disabled = false,
  className,
  minDate,
  defaultDuration = 30,
}: DateTimeRangePickerProps) {
  // Initialize with defaults
  const defaultDate = format(new Date(), "yyyy-MM-dd");
  const defaultStartTime = "09:00";
  const defaultEndTime = calculateEndTime(defaultStartTime, defaultDuration);

  const currentValue: DateTimeRangeValue = {
    date: value?.date || defaultDate,
    startTime: value?.startTime || defaultStartTime,
    endTime: value?.endTime || defaultEndTime,
    isAllDay: value?.isAllDay ?? false,
    timezone: value?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
  };

  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [timeError, setTimeError] = React.useState<string | null>(null);

  // Parse the date for calendar
  const selectedDate = React.useMemo(() => {
    if (!currentValue.date) return new Date();
    const parsed = parseISO(currentValue.date);
    return isValid(parsed) ? parsed : new Date();
  }, [currentValue.date]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    onChange({
      ...currentValue,
      date: format(date, "yyyy-MM-dd"),
    });
    setCalendarOpen(false);
  };

  const handleStartTimeChange = (time: string) => {
    // Validate time format
    if (!isValidTimeFormat(time)) {
      setTimeError("Invalid start time format");
      return;
    }
    setTimeError(null);

    const normalized = normalizeTime(time);
    const duration = calculateDuration(normalized, currentValue.endTime);

    // If duration becomes negative or zero, adjust end time
    if (duration <= 0) {
      const newEndTime = calculateEndTime(normalized, defaultDuration);
      onChange({
        ...currentValue,
        startTime: normalized,
        endTime: newEndTime,
      });
    } else {
      onChange({
        ...currentValue,
        startTime: normalized,
      });
    }
  };

  const handleEndTimeChange = (time: string) => {
    // Validate time format
    if (!isValidTimeFormat(time)) {
      setTimeError("Invalid end time format");
      return;
    }
    setTimeError(null);

    const normalized = normalizeTime(time);
    const duration = calculateDuration(currentValue.startTime, normalized);

    // Warn if end time is before start time (but allow it for overnight events)
    if (duration <= 0) {
      setTimeError("End time is before start time");
    }

    onChange({
      ...currentValue,
      endTime: normalized,
    });
  };

  const handleAllDayToggle = (checked: boolean) => {
    onChange({
      ...currentValue,
      isAllDay: checked,
    });
  };

  // Find closest time option
  const findClosestTimeOption = (time: string): string => {
    const parsed = parseTime(time);
    if (!parsed) return TIME_OPTIONS[0].value;

    const totalMinutes = parsed.hours * 60 + parsed.minutes;
    const roundedMinutes = Math.round(totalMinutes / 15) * 15;
    const roundedHours = Math.floor(roundedMinutes / 60) % 24;
    const roundedMins = roundedMinutes % 60;

    return `${roundedHours.toString().padStart(2, "0")}:${roundedMins.toString().padStart(2, "0")}`;
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {/* Date Picker */}
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2 px-3"
              disabled={disabled}
            >
              <Calendar className="h-4 w-4" />
              {format(selectedDate, "MM/dd/yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={minDate ? (date) => date < minDate : undefined}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Time Selectors - Hidden when All Day is selected */}
        {!currentValue.isAllDay && (
          <>
            {/* Start Time */}
            <Select
              value={findClosestTimeOption(currentValue.startTime)}
              onValueChange={handleStartTimeChange}
              disabled={disabled}
            >
              <SelectTrigger className="h-9 w-[110px]">
                <Clock className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Start">
                  {formatTimeDisplay(currentValue.startTime)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[280px]">
                {TIME_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-sm text-muted-foreground">to</span>

            {/* End Time */}
            <Select
              value={findClosestTimeOption(currentValue.endTime)}
              onValueChange={handleEndTimeChange}
              disabled={disabled}
            >
              <SelectTrigger className="h-9 w-[110px]">
                <SelectValue placeholder="End">
                  {formatTimeDisplay(currentValue.endTime)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[280px]">
                {TIME_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}

        {/* Timezone Indicator */}
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-1 px-2 text-muted-foreground"
          disabled
        >
          <Globe className="h-3.5 w-3.5" />
          <span className="text-xs">{currentValue.timezone?.split("/").pop()?.replace("_", " ") || "Local"}</span>
        </Button>

        {/* Make Recurring Button */}
        {showRecurring && onRecurringClick && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-9 gap-1.5 px-3",
              isRecurring && "text-primary"
            )}
            onClick={onRecurringClick}
            disabled={disabled}
          >
            <Repeat className={cn("h-3.5 w-3.5", isRecurring && "text-primary")} />
            <span className="text-xs">{isRecurring ? "Recurring" : "Make recurring"}</span>
          </Button>
        )}

        {/* All Day Toggle */}
        <div className="flex items-center gap-2">
          <Switch
            id="all-day"
            checked={currentValue.isAllDay}
            onCheckedChange={handleAllDayToggle}
            disabled={disabled}
          />
          <Label
            htmlFor="all-day"
            className="text-sm text-muted-foreground cursor-pointer"
          >
            All day
          </Label>
        </div>
      </div>

      {/* Error Message */}
      {timeError && (
        <p className="text-xs text-destructive">{timeError}</p>
      )}

      {/* Duration Display */}
      {!currentValue.isAllDay && !timeError && (
        <p className="text-xs text-muted-foreground">
          Duration: {Math.floor(calculateDuration(currentValue.startTime, currentValue.endTime) / 60)}h{" "}
          {calculateDuration(currentValue.startTime, currentValue.endTime) % 60 > 0 &&
            `${calculateDuration(currentValue.startTime, currentValue.endTime) % 60}m`}
        </p>
      )}
    </div>
  );
}

/**
 * Standalone time picker component for individual time fields
 */
interface TimePickerProps {
  value?: string; // HH:mm format
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function TimePicker({
  value = "",
  onChange,
  placeholder = "Select time",
  disabled = false,
  className,
}: TimePickerProps) {
  const [error, setError] = React.useState<string | null>(null);

  const handleChange = (time: string) => {
    if (!isValidTimeFormat(time)) {
      setError("Invalid time format");
      return;
    }
    setError(null);
    onChange(normalizeTime(time));
  };

  // Find closest time option for select value
  const selectValue = React.useMemo(() => {
    if (!value || !isValidTimeFormat(value)) return "";
    const parsed = parseTime(value);
    if (!parsed) return "";

    const totalMinutes = parsed.hours * 60 + parsed.minutes;
    const roundedMinutes = Math.round(totalMinutes / 15) * 15;
    const roundedHours = Math.floor(roundedMinutes / 60) % 24;
    const roundedMins = roundedMinutes % 60;

    return `${roundedHours.toString().padStart(2, "0")}:${roundedMins.toString().padStart(2, "0")}`;
  }, [value]);

  return (
    <div className={cn("space-y-1", className)}>
      <Select
        value={selectValue}
        onValueChange={handleChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder={placeholder}>
              {value && isValidTimeFormat(value) ? formatTimeDisplay(value) : placeholder}
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent className="max-h-[280px]">
          {TIME_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
