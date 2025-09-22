"use client"

import * as React from "react"
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community"
import type { AgGridReactProps } from "ag-grid-react"
import { AgGridReact } from "ag-grid-react"
import { useTheme } from "@/components/theme/theme-provider"

import { cn } from "@/lib/utils"
import type { ThemeMode } from "@/lib/themes"

ModuleRegistry.registerModules([AllCommunityModule])

const dataGridThemes = {
  quartz: "ag-theme-quartz",
  quartzDark: "ag-theme-quartz-dark",
} as const

export type DataGridTheme = keyof typeof dataGridThemes

type DataGridContainerProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "className" | "style" | "children"
>

export interface DataGridProps<TData = any>
  extends Omit<AgGridReactProps<TData>, "className" | "containerStyle" | "theme"> {
  theme?: DataGridTheme
  className?: string
  style?: React.CSSProperties
  gridClassName?: string
  gridStyle?: React.CSSProperties
  containerProps?: DataGridContainerProps
}

const themeModeToGridTheme: Record<ThemeMode, DataGridTheme> = {
  light: "quartz",
  dark: "quartzDark",
}

const DataGridRender = <TData,>(
  {
    theme: themeProp,
    className,
    style,
    gridClassName,
    gridStyle,
    containerProps,
    ...props
  }: DataGridProps<TData>,
  ref: React.ForwardedRef<AgGridReact<TData>>
) => {
  const { resolvedMode } = useTheme()
  const theme = React.useMemo(
    () => themeProp ?? themeModeToGridTheme[resolvedMode],
    [themeProp, resolvedMode]
  )
  const containerAttributes = containerProps ?? {}

  return (
    <div
      data-slot="datagrid"
      className={cn(
        "relative w-full overflow-hidden rounded-lg border border-border bg-background",
        className
      )}
      style={style}
      {...containerAttributes}
    >
      <AgGridReact<TData>
        ref={ref}
        className={cn(
          "h-full w-full [&_.ag-header]:bg-transparent [&_.ag-header]:text-muted-foreground [&_.ag-row]:text-sm [&_.ag-cell]:border-border/60",
          dataGridThemes[theme],
          gridClassName
        )}
        containerStyle={gridStyle}
        {...props}
      />
    </div>
  )
}

const DataGrid = React.forwardRef(DataGridRender) as <TData = any>(
  props: DataGridProps<TData> & { ref?: React.Ref<AgGridReact<TData>> }
) => React.ReactElement | null

Object.assign(DataGrid, { displayName: "DataGrid" })

export { DataGrid, dataGridThemes }
