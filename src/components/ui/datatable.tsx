"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { cn } from "@/lib/utils";

type SortDirection = "asc" | "desc";

type SortValue = string | number | boolean | Date | null | undefined;

interface SortState {
  columnId: string;
  direction: SortDirection;
}

export interface DataTableColumn<TData> {
  id: string;
  header: React.ReactNode;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  renderCell: (row: TData) => React.ReactNode;
  getSortValue?: (row: TData) => SortValue;
  headerClassName?: string;
  cellClassName?: string;
  style?: React.CSSProperties;
}

export interface DataTableProps<TData> {
  data: TData[];
  columns: DataTableColumn<TData>[];
  getRowId?: (row: TData, index: number) => string | number;
  className?: string;
  tableClassName?: string;
  caption?: React.ReactNode;
}

export function DataTable<TData>({
  data,
  columns,
  getRowId,
  className,
  tableClassName,
  caption,
}: DataTableProps<TData>) {
  const [sortState, setSortState] = React.useState<SortState | null>(null);

  const sortedData = React.useMemo(() => {
    if (!sortState) {
      return data;
    }
    const column = columns.find((item) => item.id === sortState.columnId);
    if (!column || column.sortable === false) {
      return data;
    }
    const accessor = column.getSortValue;
    if (!accessor) {
      return data;
    }
    const copy = [...data];
    copy.sort((a, b) => {
      const aValue = accessor(a);
      const bValue = accessor(b);
      return compareSortValues(aValue, bValue, sortState.direction);
    });
    return copy;
  }, [columns, data, sortState]);

  const toggleSort = React.useCallback(
    (column: DataTableColumn<TData>) => {
      if (column.sortable === false || !column.getSortValue) {
        return;
      }
      setSortState((previous) => {
        if (!previous || previous.columnId !== column.id) {
          return { columnId: column.id, direction: "asc" } satisfies SortState;
        }
        if (previous.direction === "asc") {
          return { columnId: column.id, direction: "desc" } satisfies SortState;
        }
        return null;
      });
    },
    []
  );

  return (
    <div
      data-slot="datatable"
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/60 bg-background",
        className
      )}
    >
      <div className="overflow-x-auto">
        <table
          className={cn(
            "min-w-full divide-y divide-border/60 text-sm",
            tableClassName
          )}
        >
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead className="bg-muted/40">
            <tr>
              {columns.map((column) => {
                const alignment = getAlignmentClass(column.align);
                const justifyClass =
                  alignment === "text-right"
                    ? "justify-end"
                    : alignment === "text-center"
                      ? "justify-center"
                      : "justify-start";
                return (
                  <th
                    key={column.id}
                    scope="col"
                    className={cn(
                      "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                      alignment,
                      column.headerClassName
                    )}
                    style={column.style}
                  >
                    {column.sortable !== false && column.getSortValue ? (
                      <button
                        type="button"
                        className={cn(
                          "flex w-full items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                          justifyClass
                        )}
                        onClick={() => toggleSort(column)}
                      >
                        <span>{column.header}</span>
                        <SortIcon
                          direction={
                            sortState?.columnId === column.id
                              ? sortState.direction
                              : undefined
                          }
                        />
                      </button>
                    ) : (
                      <span
                        className={cn(
                          "inline-flex w-full items-center text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                          justifyClass
                        )}
                      >
                        {column.header}
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {sortedData.map((row, rowIndex) => {
              const key = getRowId?.(row, rowIndex);
              const rowKey = key === undefined || key === null || key === ""
                ? `row-${rowIndex}`
                : String(key);
              return (
                <tr key={rowKey} className="bg-background transition hover:bg-muted/40">
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={cn(
                        "px-4 py-4 text-sm text-foreground align-top",
                        getAlignmentClass(column.align),
                        column.cellClassName
                      )}
                      style={column.style}
                    >
                      {column.renderCell(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getAlignmentClass(align: DataTableColumn<unknown>["align"]) {
  switch (align) {
    case "center":
      return "text-center";
    case "right":
      return "text-right";
    default:
      return "text-left";
  }
}

function compareSortValues(
  a: SortValue,
  b: SortValue,
  direction: SortDirection
): number {
  const result = basicCompare(a, b);
  return direction === "asc" ? result : -result;
}

function basicCompare(a: SortValue, b: SortValue): number {
  const normalizedA = normalizeSortValue(a);
  const normalizedB = normalizeSortValue(b);

  if (typeof normalizedA === "number" && typeof normalizedB === "number") {
    return normalizedA - normalizedB;
  }

  return String(normalizedA).localeCompare(String(normalizedB), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function normalizeSortValue(value: SortValue): string | number {
  if (value === null || value === undefined) {
    return "";
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  if (typeof value === "number") {
    return value;
  }
  return String(value);
}

function SortIcon({ direction }: { direction?: SortDirection }) {
  if (!direction) {
    return <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />;
  }
  if (direction === "asc") {
    return <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />;
  }
  return <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />;
}
