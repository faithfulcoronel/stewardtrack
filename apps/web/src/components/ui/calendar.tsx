"use client"

import * as React from "react"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import {
  addMonths,
  addYears,
  format,
  isAfter,
  isBefore,
  isSameMonth,
  startOfMonth,
} from "date-fns"
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const YEAR_GRID_SIZE = 12

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  hideNavigation,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const defaultClassNames = getDefaultClassNames()

  const {
    month: controlledMonth,
    defaultMonth,
    onMonthChange,
    startMonth,
    fromMonth,
    fromYear,
    endMonth,
    toMonth,
    toYear,
    selected,
    ...rest
  } = props

  const minMonth = React.useMemo(() => {
    if (startMonth) return startOfMonth(startMonth)
    if (fromMonth) return startOfMonth(fromMonth)
    if (typeof fromYear === "number") {
      return startOfMonth(new Date(fromYear, 0, 1))
    }
    return undefined
  }, [fromMonth, fromYear, startMonth])

  const maxMonth = React.useMemo(() => {
    if (endMonth) return startOfMonth(endMonth)
    if (toMonth) return startOfMonth(toMonth)
    if (typeof toYear === "number") {
      return startOfMonth(new Date(toYear, 11, 1))
    }
    return undefined
  }, [endMonth, toMonth, toYear])

  const getInitialMonth = React.useCallback(() => {
    if (controlledMonth) return startOfMonth(controlledMonth)
    if (defaultMonth) return startOfMonth(defaultMonth)

    if (selected instanceof Date) {
      return startOfMonth(selected)
    }

    if (selected && typeof selected === "object") {
      if (Array.isArray(selected)) {
        const found = selected.find((item) => item instanceof Date) as Date | undefined
        if (found) return startOfMonth(found)
      } else if ("from" in selected || "to" in selected) {
        const range = selected as { from?: Date | undefined; to?: Date | undefined }
        if (range.from instanceof Date) return startOfMonth(range.from)
        if (range.to instanceof Date) return startOfMonth(range.to)
      }
    }

    return startOfMonth(new Date())
  }, [controlledMonth, defaultMonth, selected])

  const isMonthControlled = controlledMonth !== undefined

  const [internalMonth, setInternalMonth] = React.useState<Date>(() => getInitialMonth())

  React.useEffect(() => {
    if (isMonthControlled && controlledMonth) {
      setInternalMonth(startOfMonth(controlledMonth))
    }
  }, [controlledMonth, isMonthControlled])

  // Track previous selected value to detect actual changes
  const prevSelectedRef = React.useRef(selected)

  React.useEffect(() => {
    if (isMonthControlled) return

    // Only sync month when selected value actually changes, not on every render
    const prevSelected = prevSelectedRef.current
    prevSelectedRef.current = selected

    // Check if selected actually changed
    const selectedChanged = (() => {
      if (prevSelected === selected) return false
      if (prevSelected instanceof Date && selected instanceof Date) {
        return prevSelected.getTime() !== selected.getTime()
      }
      if (prevSelected && selected && typeof prevSelected === "object" && typeof selected === "object") {
        const prevRange = prevSelected as { from?: Date; to?: Date }
        const currRange = selected as { from?: Date; to?: Date }
        const fromChanged = prevRange.from?.getTime() !== currRange.from?.getTime()
        const toChanged = prevRange.to?.getTime() !== currRange.to?.getTime()
        return fromChanged || toChanged
      }
      return true
    })()

    if (!selectedChanged) return

    if (selected instanceof Date) {
      setInternalMonth(startOfMonth(selected))
      return
    }

    if (selected && typeof selected === "object" && !Array.isArray(selected)) {
      const range = selected as { from?: Date | undefined; to?: Date | undefined }
      if (range.from instanceof Date) {
        setInternalMonth(startOfMonth(range.from))
        return
      }
      if (range.to instanceof Date) {
        setInternalMonth(startOfMonth(range.to))
      }
    }
  }, [isMonthControlled, selected])

  const displayedMonth = isMonthControlled ? startOfMonth(controlledMonth!) : internalMonth

  const handleMonthChange = React.useCallback(
    (next: Date) => {
      const normalized = startOfMonth(next)
      if (!isMonthControlled) {
        setInternalMonth(normalized)
      }
      onMonthChange?.(normalized)
    },
    [isMonthControlled, onMonthChange]
  )

  const isMonthInRange = React.useCallback(
    (monthDate: Date) => {
      const normalized = startOfMonth(monthDate)
      if (minMonth && isBefore(normalized, minMonth)) return false
      if (maxMonth && isAfter(normalized, maxMonth)) return false
      return true
    },
    [maxMonth, minMonth]
  )

  const [viewMode, setViewMode] = React.useState<"day" | "month" | "year">("day")

  const displayedMonthYear = displayedMonth.getFullYear()
  const displayedMonthIndex = displayedMonth.getMonth()

  React.useEffect(() => {
    setViewMode("day")
  }, [displayedMonthYear, displayedMonthIndex])

  const currentYear = displayedMonthYear

  const initialYearStart = React.useMemo(() => {
    const totalYears =
      minMonth && maxMonth
        ? maxMonth.getFullYear() - minMonth.getFullYear() + 1
        : undefined

    if (totalYears && totalYears <= YEAR_GRID_SIZE && minMonth) {
      return minMonth.getFullYear()
    }

    const baseYear = currentYear
    const start = baseYear - (baseYear % YEAR_GRID_SIZE)
    return start
  }, [currentYear, maxMonth, minMonth])

  const [yearPageStart, setYearPageStart] = React.useState(initialYearStart)

  React.useEffect(() => {
    setYearPageStart(initialYearStart)
  }, [initialYearStart])

  const clampYearStart = React.useCallback(
    (candidate: number) => {
      let start = candidate
      if (maxMonth) {
        const maxYear = maxMonth.getFullYear()
        start = Math.min(start, maxYear - YEAR_GRID_SIZE + 1)
      }
      if (minMonth) {
        const minYear = minMonth.getFullYear()
        start = Math.max(start, minYear)
      }

      if (maxMonth && minMonth) {
        const minYear = minMonth.getFullYear()
        const maxYear = maxMonth.getFullYear()
        if (maxYear - minYear + 1 < YEAR_GRID_SIZE) {
          start = minYear
        }
      }

      return start
    },
    [maxMonth, minMonth]
  )

  const canGoToPrevious = React.useMemo(() => {
    if (viewMode === "year") {
      if (!minMonth) return true
      return yearPageStart > minMonth.getFullYear()
    }

    const prev = viewMode === "day" ? addMonths(displayedMonth, -1) : addYears(displayedMonth, -1)
    return isMonthInRange(prev)
  }, [displayedMonth, isMonthInRange, minMonth, viewMode, yearPageStart])

  const canGoToNext = React.useMemo(() => {
    if (viewMode === "year") {
      if (!maxMonth) return true
      return yearPageStart + YEAR_GRID_SIZE - 1 < maxMonth.getFullYear()
    }

    const next = viewMode === "day" ? addMonths(displayedMonth, 1) : addYears(displayedMonth, 1)
    return isMonthInRange(next)
  }, [displayedMonth, isMonthInRange, maxMonth, viewMode, yearPageStart])

  const goToPrevious = React.useCallback(() => {
    if (viewMode === "year") {
      setYearPageStart((prev) => clampYearStart(prev - YEAR_GRID_SIZE))
      return
    }

    const nextMonth = viewMode === "day" ? addMonths(displayedMonth, -1) : addYears(displayedMonth, -1)
    handleMonthChange(nextMonth)
  }, [clampYearStart, displayedMonth, handleMonthChange, viewMode])

  const goToNext = React.useCallback(() => {
    if (viewMode === "year") {
      setYearPageStart((prev) => clampYearStart(prev + YEAR_GRID_SIZE))
      return
    }

    const nextMonth = viewMode === "day" ? addMonths(displayedMonth, 1) : addYears(displayedMonth, 1)
    handleMonthChange(nextMonth)
  }, [clampYearStart, displayedMonth, handleMonthChange, viewMode])

  const headerLabel = React.useMemo(() => {
    if (viewMode === "day") {
      return format(displayedMonth, "LLLL yyyy")
    }

    if (viewMode === "month") {
      return format(displayedMonth, "yyyy")
    }

    const startYear = yearPageStart
    const endYear = maxMonth
      ? Math.min(yearPageStart + YEAR_GRID_SIZE - 1, maxMonth.getFullYear())
      : yearPageStart + YEAR_GRID_SIZE - 1
    return `${startYear} – ${endYear}`
  }, [displayedMonth, maxMonth, viewMode, yearPageStart])

  const handleLabelClick = React.useCallback(() => {
    setViewMode((current) => {
      if (current === "day") return "month"
      if (current === "month") return "year"
      return "day"
    })
  }, [])

  const monthGrid = React.useMemo(() => {
    if (viewMode !== "month") return null

    return (
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 12 }, (_, index) => {
          const monthDate = startOfMonth(new Date(currentYear, index, 1))
          const disabled = !isMonthInRange(monthDate)
          const isActive = displayedMonthIndex === index
          const variant = disabled ? "outline" : isActive ? "secondary" : "ghost"
          return (
            <Button
              key={index}
              type="button"
              variant={variant}
              disabled={disabled}
              size="sm"
              className="w-full justify-center"
              onClick={() => {
                if (disabled) return
                handleMonthChange(monthDate)
                setViewMode("day")
              }}
            >
              {format(monthDate, "LLL")}
            </Button>
          )
        })}
      </div>
    )
  }, [currentYear, displayedMonthIndex, handleMonthChange, isMonthInRange, viewMode])

  const monthForYearSelection = displayedMonthIndex

  const yearGrid = React.useMemo(() => {
    if (viewMode !== "year") return null

    const minYear = minMonth?.getFullYear()
    const maxYear = maxMonth?.getFullYear()

    return (
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: YEAR_GRID_SIZE }, (_, index) => {
          const year = yearPageStart + index
          if (minYear !== undefined && year < minYear) return null
          if (maxYear !== undefined && year > maxYear) return null

          const monthDate = startOfMonth(new Date(year, monthForYearSelection, 1))
          const disabled = !isMonthInRange(monthDate)
          const isActive = displayedMonthYear === year
          const variant = disabled ? "outline" : isActive ? "secondary" : "ghost"

          return (
            <Button
              key={year}
              type="button"
              variant={variant}
              disabled={disabled}
              size="sm"
              className="w-full justify-center"
              onClick={() => {
                if (disabled) return
                handleMonthChange(monthDate)
                setViewMode("month")
              }}
            >
              {year}
            </Button>
          )
        })}
      </div>
    )
  }, [
    displayedMonthYear,
    handleMonthChange,
    isMonthInRange,
    maxMonth,
    minMonth,
    monthForYearSelection,
    viewMode,
    yearPageStart,
  ])

  const shouldHideNavigation = hideNavigation ?? false

  const containerClassName = cn(
    "bg-background group/calendar p-3 [--cell-size:--spacing(8)] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent flex flex-col gap-3",
    String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
    String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
    className
  )

  const navButtonClassName = "size-(--cell-size) p-0 select-none aria-disabled:opacity-50"

  const labelButtonClassName = cn(
    "h-(--cell-size) rounded-md px-3 text-sm font-medium transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    captionLayout === "label" ? "hover:bg-muted/60" : "[&>svg]:text-muted-foreground [&>svg]:size-3.5"
  )

  const labelAriaLabel = React.useMemo(() => {
    if (viewMode === "day") {
      return "Switch to month selection"
    }
    if (viewMode === "month") {
      return "Switch to year selection"
    }
    return "Return to day selection"
  }, [viewMode])

  const header = shouldHideNavigation
    ? null
    : (
        <div className="flex w-full items-center justify-between gap-1">
          <Button
            type="button"
            variant={buttonVariant}
            size="icon"
            className={navButtonClassName}
            onClick={goToPrevious}
            disabled={!canGoToPrevious}
            aria-label="Previous"
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={labelButtonClassName}
            onClick={handleLabelClick}
            aria-label={labelAriaLabel}
          >
            <span>{headerLabel}</span>
            {viewMode !== "year" ? <ChevronDownIcon className="size-4" /> : null}
          </Button>
          <Button
            type="button"
            variant={buttonVariant}
            size="icon"
            className={navButtonClassName}
            onClick={goToNext}
            disabled={!canGoToNext}
            aria-label="Next"
          >
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
      )

  const monthAndYearContent = viewMode === "month" ? monthGrid : yearGrid
  const contentWrapperClassName = header ? "mt-1" : undefined

  return (
    <DayPicker
      {...rest}
      month={displayedMonth}
      defaultMonth={defaultMonth}
      onMonthChange={handleMonthChange}
      startMonth={startMonth}
      fromMonth={fromMonth}
      fromYear={fromYear}
      endMonth={endMonth}
      toMonth={toMonth}
      toYear={toYear}
      hideNavigation
      showOutsideDays={showOutsideDays}
      className={containerClassName}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn("flex flex-col gap-4 md:flex-row", defaultClassNames.months),
        month: cn("flex flex-col w-full gap-4", defaultClassNames.month),
        month_caption: cn(
          "flex items-center justify-center h-(--cell-size) w-full px-(--cell-size)",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "w-full flex items-center text-sm font-medium justify-center h-(--cell-size) gap-1.5",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "relative has-focus:border-ring border border-input shadow-xs has-focus:ring-ring/50 has-focus:ring-[3px] rounded-md",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn(
          "absolute bg-popover inset-0 opacity-0",
          defaultClassNames.dropdown
        ),
        caption_label: cn(
          "select-none font-medium",
          captionLayout === "label"
            ? "text-sm"
            : "rounded-md pl-2 pr-1 flex items-center gap-1 text-sm h-8 [&>svg]:text-muted-foreground [&>svg]:size-3.5",
          defaultClassNames.caption_label
        ),
        table: "w-full border-collapse",
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] select-none",
          defaultClassNames.weekday
        ),
        week: cn("flex w-full mt-2", defaultClassNames.week),
        week_number_header: cn(
          "select-none w-(--cell-size)",
          defaultClassNames.week_number_header
        ),
        week_number: cn(
          "text-[0.8rem] select-none text-muted-foreground",
          defaultClassNames.week_number
        ),
        day: cn(
          "relative w-full h-full p-0 text-center [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md group/day aspect-square select-none",
          defaultClassNames.day
        ),
        range_start: cn(
          "rounded-l-md bg-accent",
          defaultClassNames.range_start
        ),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn("rounded-r-md bg-accent", defaultClassNames.range_end),
        today: cn(
          "bg-accent text-accent-foreground rounded-md data-[selected=true]:rounded-none",
          defaultClassNames.today
        ),
        outside: cn(
          "text-muted-foreground aria-selected:text-muted-foreground",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-muted-foreground opacity-50",
          defaultClassNames.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className: rootClassName, rootRef, children, ...rootProps }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(rootClassName)}
              {...rootProps}
            >
              {header}
              <div className={cn(contentWrapperClassName)}>
                {viewMode === "day" ? children : monthAndYearContent}
              </div>
            </div>
          )
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn("size-4", className)} {...props} />
            )
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("size-4", className)}
                {...props}
              />
            )
          }

          return (
            <ChevronDownIcon className={cn("size-4", className)} {...props} />
          )
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...weekNumberProps }) => {
          return (
            <td {...weekNumberProps}>
              <div className="flex size-(--cell-size) items-center justify-center text-center">
                {children}
              </div>
            </td>
          )
        },
        ...components,
      }}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50 dark:hover:text-accent-foreground flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px] data-[range-end=true]:rounded-md data-[range-end=true]:rounded-r-md data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-md data-[range-start=true]:rounded-l-md [&>span]:text-xs [&>span]:opacity-70",
        defaultClassNames.day,
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
