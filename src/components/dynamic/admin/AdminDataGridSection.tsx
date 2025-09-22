"use client";

import Link from "next/link";
import React from "react";
import type {
  ColDef,
  GetRowIdParams,
  ICellRendererParams,
  ValueFormatterParams,
  ValueGetterParams,
} from "ag-grid-community";

import { DataGrid } from "@/components/ui/datagrid";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { normalizeList, renderAction, type ActionConfig } from "../shared";

export type GridValue = Record<string, unknown>;

export interface GridActionConfig {
  id?: string | null;
  label: string;
  urlTemplate?: string | null;
  variant?: string | null;
  intent?: "view" | "edit" | "delete" | "link" | null;
  confirm?: string | null;
  successMessage?: string | null;
}

export interface GridColumnConfig {
  field: string;
  headerName?: string | null;
  type?: "text" | "badge" | "currency" | "date" | "chip-list" | "actions" | "link" | null;
  width?: number | null;
  minWidth?: number | null;
  flex?: number | null;
  badgeVariantField?: string | null;
  badgeMap?: Record<string, string> | null;
  hrefTemplate?: string | null;
  subtitleField?: string | null;
  actions?: GridActionConfig[] | { items?: GridActionConfig[] } | null;
  currency?: { currency?: string; notation?: "standard" | "compact" } | null;
  dateFormat?: Intl.DateTimeFormatOptions | null;
  align?: "left" | "center" | "right" | null;
  hideOnMobile?: boolean | null;
}

export interface GridFilterOption {
  label: string;
  value: string;
}

export interface GridFilterConfig {
  id: string;
  type: "search" | "select";
  label?: string | null;
  placeholder?: string | null;
  options?: GridFilterOption[] | { items?: GridFilterOption[] } | null;
  defaultValue?: string | null;
  field?: string | null;
  fields?: string[] | null;
}

export interface AdminDataGridSectionProps {
  title?: string;
  description?: string;
  rows?: GridValue[] | null;
  columns?: GridColumnConfig[] | { items?: GridColumnConfig[] } | null;
  filters?: GridFilterConfig[] | { items?: GridFilterConfig[] } | null;
  actions?: ActionConfig[] | { items?: ActionConfig[] } | null;
  emptyState?: { title?: string; description?: string } | null;
}

const badgeVariants: Record<string, string> = {
  success: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  warning: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  info: "bg-sky-500/15 text-sky-600 border-sky-500/30",
  neutral: "bg-muted text-muted-foreground border-border/60",
  critical: "bg-destructive/10 text-destructive border-destructive/40",
};

export function AdminDataGridSection(props: AdminDataGridSectionProps) {
  const columns = React.useMemo(
    () => normalizeList<GridColumnConfig>(props.columns),
    [props.columns]
  );
  const filters = React.useMemo(
    () => normalizeList<GridFilterConfig>(props.filters),
    [props.filters]
  );
  const topActions = React.useMemo(
    () => normalizeList<ActionConfig>(props.actions),
    [props.actions]
  );
  const rawRows = React.useMemo(() => [...(props.rows ?? [])], [props.rows]);
  const [tableRows, setTableRows] = React.useState<GridValue[]>(rawRows);
  const [filterState, setFilterState] = React.useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const filter of filters) {
      if (filter.defaultValue) {
        initial[filter.id] = filter.defaultValue;
      }
    }
    return initial;
  });

  React.useEffect(() => {
    setTableRows(rawRows);
  }, [rawRows]);

  const filteredRows = React.useMemo(() => {
    const searchFilters = filters.filter((filter) => filter.type === "search");
    const selectFilters = filters.filter((filter) => filter.type === "select");
    const searchTerms = searchFilters.map((filter) => {
      const value = filterState[filter.id] ?? "";
      return value.trim().toLowerCase();
    });

    return tableRows.filter((row) => {
      // Apply select filters
      for (const filter of selectFilters) {
        const active = filterState[filter.id];
        if (!active || active === "all") {
          continue;
        }
        const field = filter.field ?? filter.id;
        const value = String(resolveValue(row, field) ?? "").toLowerCase();
        if (value !== active.toLowerCase()) {
          return false;
        }
      }

      // Apply search filters (all must match)
      if (searchFilters.length > 0) {
        const matchesAll = searchFilters.every((filter, index) => {
          const term = searchTerms[index];
          if (!term) {
            return true;
          }
          const fields = filter.fields && filter.fields.length > 0 ? filter.fields : Object.keys(row);
          return fields.some((field) => {
            const value = resolveValue(row, field);
            if (value === null || value === undefined) {
              return false;
            }
            if (Array.isArray(value)) {
              return value.some((item) => String(item).toLowerCase().includes(term));
            }
            return String(value).toLowerCase().includes(term);
          });
        });
        if (!matchesAll) {
          return false;
        }
      }

      return true;
    });
  }, [filters, tableRows, filterState]);

  const columnDefs = React.useMemo<ColDef<GridValue>[]>(() => {
    return columns.map((column): ColDef<GridValue> => {
      if (column.type === "actions") {
        const actions = normalizeList<GridActionConfig>(column.actions);
        return {
          headerName: column.headerName ?? "Actions",
          field: column.field || "actions",
          cellRenderer: (params: ICellRendererParams<GridValue>) => (
            <RowActions
              actions={actions}
              row={params.data ?? {}}
              onDelete={(rowId) => {
                setTableRows((previous) => previous.filter((item) => item.id !== rowId));
              }}
            />
          ),
          sortable: false,
          filter: false,
          suppressMovable: true,
          minWidth: column.minWidth ?? 180,
          flex: column.flex ?? 0.6,
          resizable: false,
          pinned: "right",
        };
      }

      const base: ColDef = {
        headerName: column.headerName ?? startCase(column.field),
        field: column.field,
        sortable: true,
        resizable: true,
        flex: column.flex ?? 1,
        minWidth: column.minWidth ?? 160,
        wrapText: true,
        autoHeight: true,
      };

      const align = column.align ?? "left";
      const alignmentClass =
        align === "center"
          ? "ag-center-cols-container"
          : align === "right"
            ? "ag-right-aligned"
            : undefined;

      if (alignmentClass) {
        base.cellClass = alignmentClass;
      }

      switch (column.type) {
        case "badge":
          base.cellRenderer = (params: ICellRendererParams<GridValue>) => {
            const value = params.value;
            if (!value) {
              return null;
            }
            const variantField = column.badgeVariantField ?? `${column.field}Variant`;
            const variant = String(resolveValue(params.data ?? {}, variantField) ?? "neutral");
            const badgeLabel =
              column.badgeMap?.[String(value)] ??
              (typeof value === "string" ? value : String(value));
            return (
              <Badge variant="outline" className={cn("border", badgeVariants[variant] ?? badgeVariants.neutral)}>
                {badgeLabel}
              </Badge>
            );
          };
          break;
        case "currency":
          base.valueFormatter = (params: ValueFormatterParams<GridValue>) => {
            const amount = Number(params.value ?? 0);
            if (Number.isNaN(amount)) {
              return "";
            }
            const currency = column.currency?.currency ?? "USD";
            const notation = column.currency?.notation ?? "standard";
            return new Intl.NumberFormat("en-US", {
              style: "currency",
              currency,
              notation,
              maximumFractionDigits: notation === "compact" ? 1 : 0,
            }).format(amount);
          };
          break;
        case "date":
          base.valueFormatter = (params: ValueFormatterParams<GridValue>) => {
            if (!params.value) {
              return "";
            }
            const date = new Date(String(params.value));
            if (Number.isNaN(date.getTime())) {
              return String(params.value);
            }
            return new Intl.DateTimeFormat("en-US", column.dateFormat ?? {
              month: "short",
              day: "numeric",
              year: "numeric",
            }).format(date);
          };
          break;
        case "chip-list":
          base.cellRenderer = (params: ICellRendererParams<GridValue>) => {
            const items = Array.isArray(params.value) ? params.value : [];
            if (items.length === 0) {
              return null;
            }
            return (
              <div className="flex flex-wrap gap-2">
                {items.map((item: unknown, index: number) => (
                  <Badge key={`${String(item)}-${index}`} variant="outline" className="border-border/60 text-xs">
                    {String(item)}
                  </Badge>
                ))}
              </div>
            );
          };
          break;
        case "link":
          base.cellRenderer = (params: ICellRendererParams<GridValue>) => {
            const value = params.value ?? "";
            const subtitleField = column.subtitleField;
            const subtitleRaw = subtitleField
              ? resolveValue(params.data ?? {}, subtitleField)
              : null;
            const subtitle = subtitleRaw == null ? null : String(subtitleRaw);
            const href = column.hrefTemplate
              ? applyTemplate(column.hrefTemplate, params.data ?? {})
              : String(params.value ?? "#");
            return (
              <div className="flex flex-col">
                <Link href={href} className="text-sm font-semibold text-primary hover:underline" prefetch={false}>
                  {String(value)}
                </Link>
                {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
              </div>
            );
          };
          break;
        default:
          base.valueGetter = (params: ValueGetterParams<GridValue>) =>
            resolveValue(params.data ?? {}, column.field);
          break;
      }

      return base;
    });
  }, [columns, setTableRows]);

  return (
    <section className="space-y-6">
      {(props.title || props.description || topActions.length > 0) && (
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            {props.title && <h2 className="text-xl font-semibold text-foreground">{props.title}</h2>}
            {props.description && <p className="text-sm text-muted-foreground">{props.description}</p>}
          </div>
          {topActions.length > 0 && (
            <div className="flex flex-wrap gap-3">{topActions.map((action) => renderAction(action, "primary"))}</div>
          )}
        </header>
      )}

      <div className="space-y-4 rounded-3xl border border-border/60 bg-background p-4 shadow-sm">
        {filters.length > 0 && (
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-1 flex-wrap gap-3">
              {filters.map((filter) => (
                <FilterInput
                  key={filter.id}
                  filter={filter}
                  value={filterState[filter.id] ?? ""}
                  onChange={(value) =>
                    setFilterState((prev) => ({
                      ...prev,
                      [filter.id]: value,
                    }))
                  }
                />
              ))}
            </div>
            {Object.values(filterState).some(Boolean) && (
              <Button
                type="button"
                variant="ghost"
                className="self-start text-sm"
                onClick={() => setFilterState({})}
              >
                Clear filters
              </Button>
            )}
          </div>
        )}

        <div className="w-full overflow-hidden rounded-2xl border border-border/60">
          <DataGrid
            rowData={filteredRows}
            columnDefs={columnDefs}
            domLayout="autoHeight"
            className="bg-background"
            gridStyle={{ minHeight: Math.min(Math.max(filteredRows.length * 72, 320), 720) }}
            defaultColDef={{
              sortable: true,
              resizable: true,
              suppressHeaderMenuButton: true,
            }}
            suppressCellFocus
            rowSelection="single"
            getRowId={(params: GetRowIdParams<GridValue>) =>
              String(params.data?.id ?? params.data?.ID ?? params.data?.uuid ?? "")}
          />
        </div>

        {filteredRows.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border/60 bg-muted/30 p-8 text-center">
            <h3 className="text-base font-semibold text-foreground">
              {props.emptyState?.title ?? "No matching members"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {props.emptyState?.description ?? "Adjust your filters to see a different segment of the community."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function FilterInput({
  filter,
  value,
  onChange,
}: {
  filter: GridFilterConfig;
  value: string;
  onChange: (value: string) => void;
}) {
  if (filter.type === "select") {
    const options = normalizeList<GridFilterOption>(filter.options);
    return (
      <div className="flex flex-col gap-2">
        {filter.label && <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{filter.label}</span>}
        <Select value={value || filter.defaultValue || ""} onValueChange={onChange}>
          <SelectTrigger className="min-w-[10rem]">
            <SelectValue placeholder={filter.placeholder ?? "Choose"} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {filter.label && <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{filter.label}</span>}
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={filter.placeholder ?? "Search"}
        className="w-full min-w-[14rem]"
      />
    </div>
  );
}

function RowActions({
  actions,
  row,
  onDelete,
}: {
  actions: GridActionConfig[];
  row: GridValue;
  onDelete: (rowId: string) => void;
}) {
  if (!actions.length) {
    return null;
  }
  const rowId = String(row.id ?? row.ID ?? "");
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => {
        const intent = action.intent ?? "link";
        const href = action.urlTemplate ? applyTemplate(action.urlTemplate, row) : "#";
        if (intent === "delete") {
          return (
            <Button
              key={action.id ?? `${rowId}-delete`}
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => {
                const message = action.confirm
                  ? applyTemplate(action.confirm, row)
                  : `Remove ${String(row.name ?? row.title ?? "this record")}?`;
                if (window.confirm(message)) {
                  onDelete(rowId);
                  if (action.successMessage) {
                    alert(applyTemplate(action.successMessage, row));
                  }
                }
              }}
            >
              {action.label}
            </Button>
          );
        }
        const variant = action.variant ?? (intent === "view" ? "ghost" : intent === "edit" ? "secondary" : "ghost");
        return (
          <Link
            key={action.id ?? `${rowId}-${action.label}`}
            href={href}
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition",
              variant === "secondary"
                ? "border border-border/60 bg-background hover:bg-muted/40"
                : "text-primary hover:underline"
            )}
            prefetch={false}
          >
            {action.label}
          </Link>
        );
      })}
    </div>
  );
}

function startCase(value: string): string {
  return value
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (match) => match.toUpperCase());
}

function resolveValue(source: GridValue, path: string): unknown {
  if (!path.includes(".")) {
    return source[path];
  }
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, source);
}

function applyTemplate(template: string, context: GridValue): string {
  return template.replace(/\{\{(.*?)\}\}/g, (_, rawKey) => {
    const key = String(rawKey).trim();
    const value = resolveValue(context, key);
    return value === undefined || value === null ? "" : String(value);
  });
}
