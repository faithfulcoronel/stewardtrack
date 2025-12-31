"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "./calendar"

type DatePickerMode = "single" | "range"

type CalendarConfigProps = Omit<
  React.ComponentProps<typeof Calendar>,
  "mode" | "selected" | "onSelect"
>

type DatePickerShortcut<M extends DatePickerMode> = {
  label: string
  getValue: () => M extends "range" ? DateRange | undefined : Date | undefined
}

interface CommonDatePickerProps {
  /**
   * Text displayed when there is no selected date.
   */
  placeholder?: string
  /**
   * Media query that determines when the picker switches to the drawer layout.
   */
  mobileBreakpoint?: string
  /**
   * Custom formatter for the value rendered in the trigger button.
   */
  formatValue?: (args: {
    value: Date | DateRange | undefined
    mode: DatePickerMode
  }) => string
  /**
   * Alignment for the desktop popover.
   */
  align?: React.ComponentProps<typeof PopoverContent>["align"]
  /**
   * Offset for the desktop popover.
   */
  sideOffset?: React.ComponentProps<typeof PopoverContent>["sideOffset"]
  /**
   * Class name applied to the outer wrapper element.
   */
  className?: string
  /**
   * Props forwarded to the trigger button.
   */
  buttonProps?: React.ComponentProps<typeof Button>
  /**
   * Close the surface automatically after a value is selected.
   */
  closeOnSelect?: boolean
  /**
   * Show a clear button when a value is selected.
   */
  clearable?: boolean
  /**
   * Accessible label for the clear button.
   */
  clearLabel?: string
  /**
   * Title displayed at the top of the mobile drawer.
   */
  title?: string
  /**
   * Optional supporting description displayed in the mobile drawer.
   */
  description?: string
  /**
   * Disable interaction with the trigger button.
   */
  isDisabled?: boolean
  /**
   * Optional class name for the content wrapper inside the overlay surface.
   */
  contentClassName?: string
  /**
   * Optional label shown above the quick shortcut actions.
   */
  shortcutsLabel?: string
  /**
   * Props forwarded to the underlying calendar component.
   */
  calendarProps?: CalendarConfigProps
  /**
   * Called when the surface is opened or closed.
   */
  onOpenChange?: (open: boolean) => void
}

type SingleDatePickerProps = CommonDatePickerProps & {
  mode?: "single"
  value?: Date | null
  defaultValue?: Date | null
  onChange?: (value: Date | undefined) => void
  shortcuts?: DatePickerShortcut<"single">[]
}

type RangeDatePickerProps = CommonDatePickerProps & {
  mode: "range"
  value?: DateRange | null
  defaultValue?: DateRange | null
  onChange?: (value: DateRange | undefined) => void
  shortcuts?: DatePickerShortcut<"range">[]
}

type DatePickerProps = SingleDatePickerProps | RangeDatePickerProps

const DEFAULT_SINGLE_SHORTCUTS: DatePickerShortcut<"single">[] = [
  {
    label: "Today",
    getValue: () => startOfDay(new Date()),
  },
  {
    label: "Tomorrow",
    getValue: () => startOfDay(addDays(new Date(), 1)),
  },
  {
    label: "Next 7 days",
    getValue: () => startOfDay(addDays(new Date(), 7)),
  },
]

const DEFAULT_RANGE_SHORTCUTS: DatePickerShortcut<"range">[] = [
  {
    label: "Next 7 days",
    getValue: () => {
      const from = startOfDay(new Date())
      return { from, to: addDays(from, 6) }
    },
  },
  {
    label: "Next 30 days",
    getValue: () => {
      const from = startOfDay(new Date())
      return { from, to: addDays(from, 29) }
    },
  },
  {
    label: "This month",
    getValue: () => {
      const today = new Date()
      return { from: startOfMonth(today), to: endOfMonth(today) }
    },
  },
  {
    label: "This week",
    getValue: () => {
      const today = new Date()
      const from = startOfWeek(today)
      const to = endOfWeek(today)
      return { from, to }
    },
  },
]

const DEFAULT_PLACEHOLDER = "Select date"
const DEFAULT_SHORTCUTS_LABEL = "Quick picks"

const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
  (props, forwardedRef) => {
    const {
      placeholder = DEFAULT_PLACEHOLDER,
      mobileBreakpoint = "(min-width: 768px)",
      formatValue,
      align = "start",
      sideOffset = 8,
      className,
      buttonProps,
      closeOnSelect = true,
      clearable = true,
      clearLabel = "Clear selection",
      title = "Select date",
      description,
      isDisabled = false,
      contentClassName,
      shortcutsLabel = DEFAULT_SHORTCUTS_LABEL,
      calendarProps = {},
      onOpenChange,
    } = props

    const mode: DatePickerMode = props.mode ?? "single"
    const isRange = mode === "range"

    const valueProp = isRange
      ? normalizeRange((props as RangeDatePickerProps).value)
      : normalizeSingle((props as SingleDatePickerProps).value)

    const defaultValueProp = isRange
      ? normalizeRange((props as RangeDatePickerProps).defaultValue)
      : normalizeSingle((props as SingleDatePickerProps).defaultValue)

    const onChangeHandler = isRange
      ? (props as RangeDatePickerProps).onChange
      : (props as SingleDatePickerProps).onChange

    const providedShortcuts = isRange
      ? (props as RangeDatePickerProps).shortcuts
      : (props as SingleDatePickerProps).shortcuts

    const shortcuts = providedShortcuts ?? (isRange ? DEFAULT_RANGE_SHORTCUTS : DEFAULT_SINGLE_SHORTCUTS)

    const isControlled = Object.prototype.hasOwnProperty.call(props, "value")

    const [internalValue, setInternalValue] = React.useState<Date | DateRange | undefined>(
      () => valueProp ?? defaultValueProp
    )

    React.useEffect(() => {
      if (isControlled) {
        return
      }

      if (defaultValueProp !== undefined) {
        setInternalValue(defaultValueProp)
      }
    }, [defaultValueProp, isControlled])

    const selectedValue = isControlled ? valueProp : internalValue

    const [open, setOpen] = React.useState(false)

    const handleOpenChange = React.useCallback(
      (nextOpen: boolean) => {
        setOpen(nextOpen)
        onOpenChange?.(nextOpen)
      },
      [onOpenChange]
    )

    const [isDesktop, setIsDesktop] = React.useState(() => {
      if (typeof window === "undefined") return false
      return window.matchMedia(mobileBreakpoint).matches
    })

    React.useEffect(() => {
      if (typeof window === "undefined") return undefined

      const query = window.matchMedia(mobileBreakpoint)

      const update = (event: MediaQueryList | MediaQueryListEvent) => {
        setIsDesktop(event.matches)
      }

      update(query)

      if (typeof query.addEventListener === "function") {
        const listener = (event: MediaQueryListEvent) => update(event)
        query.addEventListener("change", listener)
        return () => query.removeEventListener("change", listener)
      }

      const legacyListener = (event: MediaQueryListEvent) => update(event)
      query.addListener(legacyListener)
      return () => query.removeListener(legacyListener)
    }, [mobileBreakpoint])

    const isMobile = !isDesktop

    const handleValueChange = React.useCallback(
      (nextValue: Date | DateRange | undefined) => {
        if (!isControlled) {
          setInternalValue(nextValue)
        }

        if (isRange) {
          ;(onChangeHandler as ((value: DateRange | undefined) => void) | undefined)?.(
            nextValue as DateRange | undefined
          )
        } else {
          ;(onChangeHandler as ((value: Date | undefined) => void) | undefined)?.(nextValue as Date | undefined)
        }
      },
      [isControlled, isRange, onChangeHandler]
    )

    const closeIfNeeded = React.useCallback(
      (nextValue: Date | DateRange | undefined) => {
        if (!closeOnSelect) return

        if (mode === "single") {
          if (nextValue instanceof Date) {
            handleOpenChange(false)
          }
          return
        }

        const range = nextValue as DateRange | undefined
        if (range?.from && range?.to) {
          handleOpenChange(false)
        }
      },
      [closeOnSelect, handleOpenChange, mode]
    )

    const calendarSelection = isRange
      ? (selectedValue as DateRange | undefined)
      : (selectedValue as Date | undefined)

    const onCalendarSelect = React.useCallback(
      (nextValue: Date | DateRange | undefined) => {
        handleValueChange(nextValue)
        closeIfNeeded(nextValue)
      },
      [closeIfNeeded, handleValueChange]
    )

    const hasSelection = React.useMemo(() => {
      if (mode === "single") {
        return selectedValue instanceof Date
      }

      const range = selectedValue as DateRange | undefined
      return Boolean(range?.from || range?.to)
    }, [mode, selectedValue])

    const displayValue = React.useMemo(() => {
      if (!hasSelection) {
        return placeholder
      }

      const formatted = formatValue
        ? formatValue({ value: selectedValue, mode })
        : formatSelectedValue(selectedValue, mode)

      return formatted || placeholder
    }, [formatValue, hasSelection, mode, placeholder, selectedValue])

    const {
      className: triggerClassName,
      variant = "outline",
      size = "default",
      disabled: triggerDisabled,
      onClick: triggerOnClick,
      ...triggerProps
    } = buttonProps ?? {}

    const triggerButton = (
      <Button
        ref={forwardedRef}
        type="button"
        variant={variant}
        size={size}
        disabled={isDisabled || triggerDisabled}
        className={cn(
          "h-10 w-full justify-start gap-2 text-left font-medium",
          !hasSelection && "text-muted-foreground",
          triggerClassName
        )}
        onClick={(event) => {
          triggerOnClick?.(event)
        }}
        {...triggerProps}
      >
        <CalendarIcon className="size-4 text-muted-foreground" />
        <span className="flex-1 truncate">{displayValue}</span>
      </Button>
    )

    const {
      className: calendarClassName,
      numberOfMonths,
      ...calendarRest
    } = calendarProps

    const calendarElement = (
      <Calendar
        mode={mode as never}
        selected={calendarSelection as never}
        onSelect={onCalendarSelect as never}
        numberOfMonths={numberOfMonths ?? (isDesktop ? 2 : 1)}
        className={cn("mx-auto", calendarClassName)}
        {...calendarRest}
      />
    )

    const showDoneButton = !closeOnSelect || isMobile
    const showClearButton = clearable && hasSelection

    const shortcutsContent = shortcuts.length ? (
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {shortcutsLabel}
        </p>
        <div className="flex flex-wrap gap-2">
          {shortcuts.map((shortcut) => (
            <Button
              key={shortcut.label}
              type="button"
              size="sm"
              variant="secondary"
              className="rounded-full"
              onClick={() => {
                const nextValue = shortcut.getValue()
                handleValueChange(nextValue)
                closeIfNeeded(nextValue)
              }}
            >
              {shortcut.label}
            </Button>
          ))}
        </div>
      </div>
    ) : null

    const footerContent = showClearButton || showDoneButton ? (
      <div className="flex items-center gap-2 pt-2">
        {showClearButton ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              handleValueChange(undefined)
            }}
            aria-label={clearLabel}
          >
            {clearLabel}
          </Button>
        ) : null}
        {showDoneButton ? (
          <Button type="button" size="sm" className="ml-auto" onClick={() => handleOpenChange(false)}>
            Done
          </Button>
        ) : null}
      </div>
    ) : null

    const overlayContent = (
      <div className={cn("space-y-4", contentClassName)}>
        {shortcutsContent}
        {calendarElement}
        {footerContent}
      </div>
    )

    const desktopView = (
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
        <PopoverContent align={align} sideOffset={sideOffset} className="w-auto max-w-[90vw] p-4">
          {overlayContent}
        </PopoverContent>
      </Popover>
    )

    const mobileView = (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="space-y-2 border-b px-6 pb-4 pt-6 text-left">
            <DrawerTitle>{title}</DrawerTitle>
            {description ? <DrawerDescription>{description}</DrawerDescription> : null}
          </DrawerHeader>
          <div className="px-4 pb-6 pt-4">
            {overlayContent}
          </div>
        </DrawerContent>
      </Drawer>
    )

    return <div className={cn("w-full", className)}>{isMobile ? mobileView : desktopView}</div>
  }
)

DatePicker.displayName = "DatePicker"

function formatSelectedValue(value: Date | DateRange | undefined, mode: DatePickerMode): string {
  if (!value) return ""

  if (mode === "single") {
    const date = value as Date
    return format(date, "LLL d, yyyy")
  }

  const range = value as DateRange
  const { from, to } = range

  if (from && to) {
    if (isSameMonth(from, to)) {
      return `${format(from, "LLL d")} – ${format(to, "d, yyyy")}`
    }

    return `${format(from, "LLL d, yyyy")} – ${format(to, "LLL d, yyyy")}`
  }

  if (from) {
    return `${format(from, "LLL d, yyyy")} – …`
  }

  if (to) {
    return `… – ${format(to, "LLL d, yyyy")}`
  }

  return ""
}

function normalizeSingle(value?: Date | null) {
  return value ?? undefined
}

function normalizeRange(value?: DateRange | null) {
  return value ?? undefined
}

export { DatePicker }

