"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarDays, ChevronDown, Repeat } from "lucide-react";

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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";

// Days of the week
const WEEKDAYS = [
  { value: "SU", label: "Sun", fullLabel: "Sunday" },
  { value: "MO", label: "Mon", fullLabel: "Monday" },
  { value: "TU", label: "Tue", fullLabel: "Tuesday" },
  { value: "WE", label: "Wed", fullLabel: "Wednesday" },
  { value: "TH", label: "Thu", fullLabel: "Thursday" },
  { value: "FR", label: "Fri", fullLabel: "Friday" },
  { value: "SA", label: "Sat", fullLabel: "Saturday" },
];

// Preset recurrence options
type RecurrencePreset =
  | "none"
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "yearly"
  | "weekdays"
  | "custom";

interface RecurrenceConfig {
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  interval: number;
  byDay?: string[]; // For weekly: ["MO", "WE", "FR"]
  byMonthDay?: number; // For monthly: day of month
  bySetPos?: number; // For monthly: 1st, 2nd, 3rd, 4th, -1 (last)
  count?: number; // End after X occurrences
  until?: string; // End by date (YYYY-MM-DD)
}

interface RecurrencePickerProps {
  value?: string; // RRULE string
  onChange: (value: string) => void;
  startDate?: Date; // Used to generate context-aware labels
  disabled?: boolean;
  className?: string;
}

// Parse RRULE string to RecurrenceConfig
function parseRRule(rrule: string): RecurrenceConfig | null {
  if (!rrule || rrule.trim() === "") {
    return null;
  }

  const config: RecurrenceConfig = {
    frequency: "WEEKLY",
    interval: 1,
  };

  const parts = rrule.split(";");
  for (const part of parts) {
    const [key, value] = part.split("=");
    switch (key) {
      case "FREQ":
        config.frequency = value as RecurrenceConfig["frequency"];
        break;
      case "INTERVAL":
        config.interval = parseInt(value, 10) || 1;
        break;
      case "BYDAY":
        config.byDay = value.split(",");
        break;
      case "BYMONTHDAY":
        config.byMonthDay = parseInt(value, 10);
        break;
      case "BYSETPOS":
        config.bySetPos = parseInt(value, 10);
        break;
      case "COUNT":
        config.count = parseInt(value, 10);
        break;
      case "UNTIL":
        // RRULE UNTIL format is YYYYMMDD or YYYYMMDDTHHMMSSZ
        const dateStr = value.replace(/T.*$/, "");
        if (dateStr.length === 8) {
          config.until = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
        }
        break;
    }
  }

  return config;
}

// Convert RecurrenceConfig to RRULE string
function toRRule(config: RecurrenceConfig | null): string {
  if (!config) {
    return "";
  }

  const parts: string[] = [`FREQ=${config.frequency}`];

  if (config.interval > 1) {
    parts.push(`INTERVAL=${config.interval}`);
  }

  if (config.byDay && config.byDay.length > 0) {
    parts.push(`BYDAY=${config.byDay.join(",")}`);
  }

  if (config.byMonthDay !== undefined) {
    parts.push(`BYMONTHDAY=${config.byMonthDay}`);
  }

  if (config.bySetPos !== undefined) {
    parts.push(`BYSETPOS=${config.bySetPos}`);
  }

  if (config.count !== undefined) {
    parts.push(`COUNT=${config.count}`);
  }

  if (config.until) {
    const untilFormatted = config.until.replace(/-/g, "");
    parts.push(`UNTIL=${untilFormatted}`);
  }

  return parts.join(";");
}

// Detect preset from RRULE
// startDate is used to determine if a weekly/biweekly pattern matches the preset
// (preset uses startDate's day, custom uses explicitly selected days)
function detectPreset(rrule: string, startDate?: Date): RecurrencePreset {
  if (!rrule || rrule.trim() === "") {
    return "none";
  }

  const config = parseRRule(rrule);
  if (!config) {
    return "none";
  }

  // Get the expected day from startDate for comparison
  const expectedDay = startDate ? WEEKDAYS[startDate.getDay()].value : null;

  // Check for weekdays (Mon-Fri)
  if (
    config.frequency === "WEEKLY" &&
    config.interval === 1 &&
    config.byDay &&
    config.byDay.length === 5 &&
    ["MO", "TU", "WE", "TH", "FR"].every((d) => config.byDay?.includes(d))
  ) {
    return "weekdays";
  }

  // Check for simple patterns
  if (config.frequency === "DAILY" && config.interval === 1 && !config.byDay) {
    return "daily";
  }

  // Weekly: only match preset if BYDAY matches startDate's day (or no BYDAY)
  if (config.frequency === "WEEKLY" && config.interval === 1) {
    // No BYDAY means it uses the start date's day implicitly
    if (!config.byDay || config.byDay.length === 0) {
      return "weekly";
    }
    // Single day that matches startDate's day = preset
    if (config.byDay.length === 1 && expectedDay && config.byDay[0] === expectedDay) {
      return "weekly";
    }
    // Otherwise it's a custom configuration
    return "custom";
  }

  // Biweekly: same logic as weekly
  if (config.frequency === "WEEKLY" && config.interval === 2) {
    if (!config.byDay || config.byDay.length === 0) {
      return "biweekly";
    }
    if (config.byDay.length === 1 && expectedDay && config.byDay[0] === expectedDay) {
      return "biweekly";
    }
    return "custom";
  }

  if (config.frequency === "MONTHLY" && config.interval === 1) {
    return "monthly";
  }

  if (config.frequency === "YEARLY" && config.interval === 1) {
    return "yearly";
  }

  return "custom";
}

// Generate human-readable description
function getRecurrenceDescription(rrule: string, startDate?: Date): string {
  if (!rrule || rrule.trim() === "") {
    return "Does not repeat";
  }

  const config = parseRRule(rrule);
  if (!config) {
    return "Does not repeat";
  }

  const dayName = startDate ? format(startDate, "EEEE") : "Sunday";
  const monthDay = startDate ? format(startDate, "do") : "1st";
  const monthName = startDate ? format(startDate, "MMMM d") : "January 1";

  let description = "";

  switch (config.frequency) {
    case "DAILY":
      description = config.interval === 1 ? "Daily" : `Every ${config.interval} days`;
      break;
    case "WEEKLY":
      if (config.byDay && config.byDay.length > 0) {
        if (config.byDay.length === 5 && ["MO", "TU", "WE", "TH", "FR"].every((d) => config.byDay?.includes(d))) {
          description = "Every weekday (Mon-Fri)";
        } else {
          const dayLabels = config.byDay.map((d) => WEEKDAYS.find((w) => w.value === d)?.fullLabel || d);
          if (config.interval === 1) {
            description = `Weekly on ${dayLabels.join(", ")}`;
          } else {
            description = `Every ${config.interval} weeks on ${dayLabels.join(", ")}`;
          }
        }
      } else {
        description = config.interval === 1 ? `Weekly on ${dayName}` : `Every ${config.interval} weeks on ${dayName}`;
      }
      break;
    case "MONTHLY":
      description = config.interval === 1 ? `Monthly on the ${monthDay}` : `Every ${config.interval} months on the ${monthDay}`;
      break;
    case "YEARLY":
      description = config.interval === 1 ? `Annually on ${monthName}` : `Every ${config.interval} years on ${monthName}`;
      break;
  }

  // Add end condition
  if (config.count) {
    description += `, ${config.count} times`;
  } else if (config.until) {
    try {
      const untilDate = new Date(config.until);
      description += `, until ${format(untilDate, "MMM d, yyyy")}`;
    } catch {
      // Ignore invalid date
    }
  }

  return description;
}

// Generate preset RRULE based on start date
function getPresetRRule(preset: RecurrencePreset, startDate?: Date): string {
  const dayOfWeek = startDate ? WEEKDAYS[startDate.getDay()].value : "SU";

  switch (preset) {
    case "none":
      return "";
    case "daily":
      return "FREQ=DAILY";
    case "weekly":
      return `FREQ=WEEKLY;BYDAY=${dayOfWeek}`;
    case "biweekly":
      return `FREQ=WEEKLY;INTERVAL=2;BYDAY=${dayOfWeek}`;
    case "monthly":
      return "FREQ=MONTHLY";
    case "yearly":
      return "FREQ=YEARLY";
    case "weekdays":
      return "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR";
    default:
      return "";
  }
}

export function RecurrencePicker({
  value = "",
  onChange,
  startDate,
  disabled = false,
  className,
}: RecurrencePickerProps) {
  const [customDialogOpen, setCustomDialogOpen] = React.useState(false);
  const [customConfig, setCustomConfig] = React.useState<RecurrenceConfig>({
    frequency: "WEEKLY",
    interval: 1,
    byDay: startDate ? [WEEKDAYS[startDate.getDay()].value] : ["SU"],
  });

  const currentPreset = detectPreset(value, startDate);
  const description = getRecurrenceDescription(value, startDate);

  // Get day label based on start date
  const dayLabel = startDate ? format(startDate, "EEEE") : "Sunday";
  const monthDayLabel = startDate ? format(startDate, "do") : "1st";
  const monthLabel = startDate ? format(startDate, "MMMM d") : "January 1";

  const handlePresetChange = (preset: string) => {
    if (preset === "custom") {
      // Parse current value to initialize custom dialog
      const parsed = parseRRule(value);
      if (parsed) {
        setCustomConfig(parsed);
      } else {
        setCustomConfig({
          frequency: "WEEKLY",
          interval: 1,
          byDay: startDate ? [WEEKDAYS[startDate.getDay()].value] : ["SU"],
        });
      }
      setCustomDialogOpen(true);
    } else {
      const rrule = getPresetRRule(preset as RecurrencePreset, startDate);
      onChange(rrule);
    }
  };

  const handleCustomSave = () => {
    const rrule = toRRule(customConfig);
    onChange(rrule);
    setCustomDialogOpen(false);
  };

  const toggleDay = (day: string) => {
    setCustomConfig((prev) => {
      const currentDays = prev.byDay || [];
      const newDays = currentDays.includes(day)
        ? currentDays.filter((d) => d !== day)
        : [...currentDays, day];
      return { ...prev, byDay: newDays.length > 0 ? newDays : undefined };
    });
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Select value={currentPreset} onValueChange={handlePresetChange} disabled={disabled}>
        <SelectTrigger className="w-full">
          <div className="flex items-center gap-2">
            <Repeat className="h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Select recurrence" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Does not repeat</SelectItem>
          <SelectItem value="daily">Daily</SelectItem>
          <SelectItem value="weekly">Weekly on {dayLabel}</SelectItem>
          <SelectItem value="biweekly">Every 2 weeks on {dayLabel}</SelectItem>
          <SelectItem value="monthly">Monthly on the {monthDayLabel}</SelectItem>
          <SelectItem value="yearly">Annually on {monthLabel}</SelectItem>
          <SelectItem value="weekdays">Every weekday (Mon-Fri)</SelectItem>
          <SelectItem value="custom">Custom...</SelectItem>
        </SelectContent>
      </Select>

      {value && currentPreset !== "none" && (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <CalendarDays className="h-3.5 w-3.5" />
          {description}
        </p>
      )}

      <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Custom recurrence</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Frequency and Interval */}
            <div className="flex items-center gap-3">
              <Label className="shrink-0">Repeat every</Label>
              <Input
                type="number"
                min={1}
                max={99}
                value={customConfig.interval}
                onChange={(e) =>
                  setCustomConfig((prev) => ({
                    ...prev,
                    interval: Math.max(1, parseInt(e.target.value, 10) || 1),
                  }))
                }
                className="w-20"
              />
              <Select
                value={customConfig.frequency}
                onValueChange={(value) =>
                  setCustomConfig((prev) => ({
                    ...prev,
                    frequency: value as RecurrenceConfig["frequency"],
                    byDay: value === "WEEKLY" ? prev.byDay : undefined,
                  }))
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">{customConfig.interval === 1 ? "day" : "days"}</SelectItem>
                  <SelectItem value="WEEKLY">{customConfig.interval === 1 ? "week" : "weeks"}</SelectItem>
                  <SelectItem value="MONTHLY">{customConfig.interval === 1 ? "month" : "months"}</SelectItem>
                  <SelectItem value="YEARLY">{customConfig.interval === 1 ? "year" : "years"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Day selection for weekly */}
            {customConfig.frequency === "WEEKLY" && (
              <div className="space-y-3">
                <Label>Repeat on</Label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      className={cn(
                        "h-10 w-10 rounded-full text-sm font-medium transition-colors",
                        customConfig.byDay?.includes(day.value)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                      )}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* End condition */}
            <div className="space-y-3">
              <Label>Ends</Label>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="end-never"
                    checked={!customConfig.count && !customConfig.until}
                    onCheckedChange={() =>
                      setCustomConfig((prev) => ({
                        ...prev,
                        count: undefined,
                        until: undefined,
                      }))
                    }
                  />
                  <Label htmlFor="end-never" className="font-normal cursor-pointer">
                    Never
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="end-after"
                    checked={customConfig.count !== undefined}
                    onCheckedChange={(checked) =>
                      setCustomConfig((prev) => ({
                        ...prev,
                        count: checked ? 10 : undefined,
                        until: undefined,
                      }))
                    }
                  />
                  <Label htmlFor="end-after" className="font-normal cursor-pointer">
                    After
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={999}
                    value={customConfig.count || ""}
                    onChange={(e) =>
                      setCustomConfig((prev) => ({
                        ...prev,
                        count: parseInt(e.target.value, 10) || undefined,
                        until: undefined,
                      }))
                    }
                    className="w-20"
                    disabled={customConfig.count === undefined}
                  />
                  <span className="text-sm text-muted-foreground">occurrences</span>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="end-on"
                    checked={customConfig.until !== undefined}
                    onCheckedChange={(checked) =>
                      setCustomConfig((prev) => ({
                        ...prev,
                        until: checked ? format(new Date(), "yyyy-MM-dd") : undefined,
                        count: undefined,
                      }))
                    }
                  />
                  <Label htmlFor="end-on" className="font-normal cursor-pointer">
                    On
                  </Label>
                  <DatePicker
                    mode="single"
                    value={customConfig.until ? new Date(customConfig.until) : undefined}
                    onChange={(date) =>
                      setCustomConfig((prev) => ({
                        ...prev,
                        until: date ? format(date, "yyyy-MM-dd") : undefined,
                        count: undefined,
                      }))
                    }
                    placeholder="Select end date"
                    isDisabled={customConfig.until === undefined}
                    buttonProps={{ variant: "outline", className: "w-40" }}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCustomSave}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
