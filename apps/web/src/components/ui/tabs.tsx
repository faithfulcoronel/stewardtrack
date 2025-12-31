"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  )
}

/**
 * TabsList - Mobile-first scrollable tabs container
 *
 * Features:
 * - Horizontal scroll on mobile with hidden scrollbar
 * - Pill-style background container
 * - Touch-friendly with momentum scrolling
 */
function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        // Base - flex container with gap
        "flex w-full items-center gap-1",
        // Allow horizontal scroll
        "overflow-x-auto",
        // Hide scrollbar
        "scrollbar-none",
        // Background container styling
        "rounded-xl bg-muted/50 p-1.5",
        className
      )}
      style={{
        // Inline styles as backup for scrollbar hiding
        WebkitOverflowScrolling: 'touch',
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
      }}
      {...props}
    />
  )
}

/**
 * TabsTrigger - Mobile-first tab button
 *
 * Features:
 * - Large touch target (min 44px height on mobile)
 * - Clear active state
 * - Icon support
 */
function TabsTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        // Base layout
        "inline-flex items-center justify-center gap-2",
        // Mobile-first sizing (44px touch target)
        "min-h-[44px] px-4 py-2.5",
        // Desktop refinement
        "sm:min-h-[38px] sm:px-4 sm:py-2",
        // Typography
        "text-sm font-medium whitespace-nowrap",
        // Default inactive state
        "text-muted-foreground",
        // Border radius
        "rounded-lg",
        // Smooth transitions
        "transition-all duration-150",
        // Active state - highlighted tab
        "data-[state=active]:bg-background",
        "data-[state=active]:text-foreground",
        "data-[state=active]:shadow-sm",
        // Hover on inactive
        "hover:text-foreground hover:bg-background/50",
        // Focus state
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        // Disabled
        "disabled:pointer-events-none disabled:opacity-50",
        // Icon sizing
        "[&_svg]:size-4 [&_svg]:shrink-0",
        // Shrink prevention
        "shrink-0",
        className
      )}
      {...props}
    >
      {children}
    </TabsPrimitive.Trigger>
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "flex-1 outline-none mt-2",
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
