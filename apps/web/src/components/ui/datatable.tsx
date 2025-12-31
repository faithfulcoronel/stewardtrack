"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "./button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

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
  enablePagination?: boolean;
  pageSizeOptions?: number[];
  initialPageSize?: number;
}

export function DataTable<TData>({
  data,
  columns,
  getRowId,
  className,
  tableClassName,
  caption,
  enablePagination = false,
  pageSizeOptions,
  initialPageSize,
}: DataTableProps<TData>) {
  const [sortState, setSortState] = React.useState<SortState | null>(null);

  const paginationOptions = React.useMemo(() => {
    if (!enablePagination) {
      return [] as number[];
    }
    const options =
      pageSizeOptions && pageSizeOptions.length > 0
        ? pageSizeOptions
        : [10, 25, 50, 100];
    const unique = Array.from(
      new Set(
        options.filter((option) => Number.isFinite(option) && option > 0)
      )
    );
    unique.sort((a, b) => a - b);
    return unique.length > 0 ? unique : [10, 25, 50, 100];
  }, [enablePagination, pageSizeOptions]);

  const resolvedInitialPageSize = React.useMemo(() => {
    if (!enablePagination) {
      return 0;
    }
    if (
      typeof initialPageSize === "number" &&
      paginationOptions.includes(initialPageSize)
    ) {
      return initialPageSize;
    }
    return paginationOptions[0] ?? 10;
  }, [enablePagination, initialPageSize, paginationOptions]);

  const [pageSize, setPageSize] = React.useState(resolvedInitialPageSize);
  const [currentPage, setCurrentPage] = React.useState(0);

  React.useEffect(() => {
    if (!enablePagination) {
      return;
    }
    setPageSize(resolvedInitialPageSize);
  }, [enablePagination, resolvedInitialPageSize]);

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

  const effectivePageSize = enablePagination ? Math.max(1, pageSize) : 0;
  const totalItems = sortedData.length;
  const totalPages = enablePagination
    ? Math.max(1, Math.ceil(totalItems / effectivePageSize))
    : 1;

  React.useEffect(() => {
    if (!enablePagination) {
      return;
    }
    setCurrentPage((previous) => {
      const maxPage = Math.max(0, totalPages - 1);
      return previous > maxPage ? maxPage : previous;
    });
  }, [enablePagination, totalPages]);

  React.useEffect(() => {
    if (!enablePagination) {
      return;
    }
    setCurrentPage(0);
  }, [data, enablePagination]);

  const safeCurrentPage = enablePagination
    ? Math.min(currentPage, Math.max(0, totalPages - 1))
    : 0;
  const startIndex = enablePagination ? safeCurrentPage * effectivePageSize : 0;
  const paginatedData = enablePagination
    ? sortedData.slice(startIndex, startIndex + effectivePageSize)
    : sortedData;
  const rangeStart = totalItems === 0 ? 0 : startIndex + 1;
  const rangeEnd = totalItems === 0 ? 0 : startIndex + paginatedData.length;
  const isFirstPage = safeCurrentPage === 0 || totalItems === 0;
  const isLastPage = safeCurrentPage >= totalPages - 1 || totalItems === 0;

  const handlePreviousPage = React.useCallback(() => {
    setCurrentPage((previous) => Math.max(previous - 1, 0));
  }, []);

  const handleNextPage = React.useCallback(() => {
    setCurrentPage((previous) => {
      const maxPage = Math.max(0, totalPages - 1);
      return Math.min(previous + 1, maxPage);
    });
  }, [totalPages]);

  const handlePageSizeChange = React.useCallback((value: string) => {
    const next = Number(value);
    if (!Number.isFinite(next) || next <= 0) {
      return;
    }
    setPageSize(next);
    setCurrentPage(0);
  }, []);

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
            {paginatedData.map((row, rowIndex) => {
              const absoluteIndex = enablePagination
                ? startIndex + rowIndex
                : rowIndex;
              const key = getRowId?.(row, absoluteIndex);
              const rowKey =
                key === undefined || key === null || key === ""
                  ? `row-${absoluteIndex}`
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
      {enablePagination && (
        <div className="flex flex-col gap-3 border-t border-border/60 bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="whitespace-nowrap">Rows per page</span>
            <Select
              value={String(effectivePageSize)}
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger size="sm" className="min-w-[4.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paginationOptions.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground sm:justify-end">
            <span className="whitespace-nowrap">
              {rangeStart === rangeEnd
                ? `${rangeEnd} of ${totalItems}`
                : `${rangeStart} – ${rangeEnd} of ${totalItems}`}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                onClick={handlePreviousPage}
                disabled={isFirstPage}
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
                <span className="sr-only">Previous page</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                onClick={handleNextPage}
                disabled={isLastPage}
              >
                <ChevronRight className="size-4" aria-hidden="true" />
                <span className="sr-only">Next page</span>
              </Button>
            </div>
          </div>
        </div>
      )}
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
