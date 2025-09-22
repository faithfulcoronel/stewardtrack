"use client";

import Link from "next/link";
import React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/datatable";
import { Input } from "@/components/ui/input";
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

  const handleDelete = React.useCallback((rowId: string) => {
    setTableRows((previous) => previous.filter((item) => getRowIdentifier(item) !== rowId));
  }, []);

  const tableColumns = React.useMemo<DataTableColumn<GridValue>[]>(() => {
    return columns.map((column) => {
      const style: React.CSSProperties = {};
      if (typeof column.width === "number") {
        style.width = `${column.width}px`;
      }
      if (typeof column.minWidth === "number") {
        style.minWidth = `${column.minWidth}px`;
      }
      const hiddenClass = column.hideOnMobile ? "hidden md:table-cell" : undefined;

      if (column.type === "actions") {
        const actions = normalizeList<GridActionConfig>(column.actions);
        const align = column.align ?? "right";
        return {
          id: column.field || "actions",
          header: column.headerName ?? "Actions",
          align,
          sortable: false,
          renderCell: (row: GridValue) => (
            <RowActions actions={actions} row={row} onDelete={handleDelete} />
          ),
          headerClassName: hiddenClass,
          cellClassName: cn("whitespace-nowrap", hiddenClass),
          style,
        } satisfies DataTableColumn<GridValue>;
      }

      const align = column.align ?? "left";

      const tableColumn: DataTableColumn<GridValue> = {
        id: column.field,
        header: column.headerName ?? startCase(column.field),
        align,
        sortable: true,
        renderCell: (row: GridValue) => renderDefaultCell(resolveValue(row, column.field)),
        getSortValue: (row: GridValue) => getComparableValue(resolveValue(row, column.field)),
        headerClassName: hiddenClass,
        cellClassName: hiddenClass,
        style,
      };

      switch (column.type) {
        case "badge":
          tableColumn.renderCell = (row: GridValue) => {
            const value = resolveValue(row, column.field);
            if (!value) {
              return <span className="text-muted-foreground">—</span>;
            }
            const variantField = column.badgeVariantField ?? `${column.field}Variant`;
            const variant = String(resolveValue(row, variantField) ?? "neutral");
            const badgeLabel =
              column.badgeMap?.[String(value)] ??
              (typeof value === "string" ? value : String(value));
            return (
              <Badge variant="outline" className={cn("border", badgeVariants[variant] ?? badgeVariants.neutral)}>
                {badgeLabel}
              </Badge>
            );
          };
          tableColumn.getSortValue = (row: GridValue) => {
            const value = resolveValue(row, column.field);
            return value == null ? null : String(value).toLowerCase();
          };
          break;
        case "currency":
          tableColumn.renderCell = (row: GridValue) => {
            const raw = resolveValue(row, column.field);
            const amount = Number(raw);
            if (Number.isNaN(amount)) {
              return <span className="text-muted-foreground">—</span>;
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
          tableColumn.getSortValue = (row: GridValue) => {
            const raw = resolveValue(row, column.field);
            const amount = Number(raw);
            return Number.isNaN(amount) ? null : amount;
          };
          break;
        case "date":
          tableColumn.renderCell = (row: GridValue) => {
            const raw = resolveValue(row, column.field);
            if (!raw) {
              return <span className="text-muted-foreground">—</span>;
            }
            const date = new Date(String(raw));
            if (Number.isNaN(date.getTime())) {
              return String(raw);
            }
            return new Intl.DateTimeFormat("en-US", column.dateFormat ?? {
              month: "short",
              day: "numeric",
              year: "numeric",
            }).format(date);
          };
          tableColumn.getSortValue = (row: GridValue) => {
            const raw = resolveValue(row, column.field);
            if (!raw) {
              return null;
            }
            const date = new Date(String(raw));
            return Number.isNaN(date.getTime()) ? null : date.getTime();
          };
          break;
        case "chip-list":
          tableColumn.renderCell = (row: GridValue) => {
            const raw = resolveValue(row, column.field);
            const list = Array.isArray(raw) ? raw : [];
            if (list.length === 0) {
              return <span className="text-muted-foreground">—</span>;
            }
            return (
              <div className="flex flex-wrap gap-2">
                {list.map((item: unknown, index: number) => (
                  <Badge key={`${String(item)}-${index}`} variant="outline" className="border-border/60 text-xs">
                    {String(item)}
                  </Badge>
                ))}
              </div>
            );
          };
          tableColumn.getSortValue = (row: GridValue) => {
            const raw = resolveValue(row, column.field);
            return Array.isArray(raw) ? raw.join(", ").toLowerCase() : "";
          };
          break;
        case "link":
          tableColumn.renderCell = (row: GridValue) => {
            const value = resolveValue(row, column.field);
            const subtitleField = column.subtitleField;
            const subtitleRaw = subtitleField ? resolveValue(row, subtitleField) : null;
            const subtitle = subtitleRaw == null ? null : String(subtitleRaw);
            const href = column.hrefTemplate
              ? applyTemplate(column.hrefTemplate, row)
              : value
                ? String(value)
                : "#";
            return (
              <div className="flex flex-col">
                <Link href={href} className="text-sm font-semibold text-primary hover:underline" prefetch={false}>
                  {value == null ? "—" : String(value)}
                </Link>
                {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
              </div>
            );
          };
          tableColumn.getSortValue = (row: GridValue) => {
            const value = resolveValue(row, column.field);
            return value == null ? null : String(value).toLowerCase();
          };
          break;
        default:
          // already configured
          break;
      }

      return tableColumn;
    });
  }, [columns, handleDelete]);

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

        <DataTable
          data={filteredRows}
          columns={tableColumns}
          getRowId={(row, index) => {
            const id = getRowIdentifier(row);
            return id || `row-${index}`;
          }}
        />

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
  const rowId = getRowIdentifier(row);
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

function renderDefaultCell(value: unknown) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }
  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : <span className="text-muted-foreground">—</span>;
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function getComparableValue(value: unknown): string | number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  return String(value).toLowerCase();
}

function getRowIdentifier(row: GridValue): string {
  return String(row.id ?? row.ID ?? row.uuid ?? "");
}
