"use client";

/**
 * AdminAgGrid - AG Grid-based data grid for admin pages
 *
 * A drop-in replacement for AdminDataGridSection that uses AG Grid
 * for improved performance, UX, and features like:
 * - Column resizing & reordering
 * - Multi-column sorting
 * - Row virtualization (handles 100K+ rows)
 * - Built-in export
 * - Keyboard navigation & accessibility
 */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React from "react";
import { toast } from "sonner";
import type { ColDef, GridReadyEvent, GridApi, ICellRendererParams, ValueFormatterParams } from "ag-grid-community";
import {
  Search,
  Filter,
  X,
  AlertTriangle,
  Trash2,
  Eye,
  Edit,
  ExternalLink,
  FileQuestion,
  Download,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { DataGrid } from "@/components/ui/datagrid";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

import { normalizeList, renderAction, type ActionConfig } from "../shared";

// ============================================================================
// Types (compatible with AdminDataGridSection)
// ============================================================================

export type GridValue = Record<string, unknown>;

export interface GridActionConfig {
  id?: string | null;
  label: string;
  urlTemplate?: string | null;
  variant?: string | null;
  intent?: "view" | "edit" | "delete" | "link" | null;
  confirm?: string | null;
  confirmTitle?: string | null;
  confirmDescription?: string | null;
  confirmLabel?: string | null;
  cancelLabel?: string | null;
  handler?: string | null;
  successMessage?: string | null;
}

export interface GridColumnConfig {
  field?: string;
  key?: string;
  headerName?: string | null;
  label?: string | null;
  type?: "text" | "badge" | "currency" | "date" | "chip-list" | "actions" | "link" | null;
  width?: number | string | null;
  minWidth?: number | null;
  flex?: number | null;
  badgeVariantField?: string | null;
  badgeMap?: Record<string, string> | null;
  hrefTemplate?: string | null;
  subtitleField?: string | null;
  avatarField?: string | null;
  avatarFirstNameField?: string | null;
  avatarLastNameField?: string | null;
  actions?: GridActionConfig[] | { items?: GridActionConfig[] } | null;
  currency?: { currency?: string; notation?: "standard" | "compact" } | null;
  dateFormat?: Intl.DateTimeFormatOptions | null;
  align?: "left" | "center" | "right" | null;
  hideOnMobile?: boolean | null;
  sortable?: boolean | null;
  resizable?: boolean | null;
  filter?: boolean | null;
}

export interface GridFilterOption {
  label: string;
  value: string;
}

export interface GridFilterConfig {
  id: string;
  type: "search" | "select" | "daterange";
  label?: string | null;
  placeholder?: string | null;
  options?: GridFilterOption[] | { items?: GridFilterOption[] } | null;
  defaultValue?: string | null;
  field?: string | null;
  fields?: string[] | null;
}

export interface AdminAgGridProps {
  title?: string;
  description?: string;
  rows?: GridValue[] | null;
  columns?: GridColumnConfig[] | { items?: GridColumnConfig[] } | null;
  filters?: GridFilterConfig[] | { items?: GridFilterConfig[] } | null;
  actions?: ActionConfig[] | { items?: ActionConfig[] } | null;
  emptyState?: { title?: string; description?: string } | null;
  exportable?: boolean;
  exportFilename?: string;
  headerSlot?: React.ReactNode;
  /** AG Grid specific: enable pagination (default: true) */
  pagination?: boolean;
  /** AG Grid specific: rows per page options */
  paginationPageSizeSelector?: number[];
  /** AG Grid specific: default page size */
  paginationPageSize?: number;
  /** AG Grid specific: row height */
  rowHeight?: number;
  /** AG Grid specific: header height */
  headerHeight?: number;
  /** AG Grid specific: enable row selection */
  rowSelection?: "single" | "multiple";
  /** AG Grid specific: suppress horizontal scroll */
  suppressHorizontalScroll?: boolean;
}

interface DeleteConfirmState {
  isOpen: boolean;
  isDeleting: boolean;
  rowId: string;
  row: GridValue | null;
  action: GridActionConfig | null;
}

// ============================================================================
// Badge Variants
// ============================================================================

const badgeVariants: Record<string, string> = {
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  info: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30",
  neutral: "bg-muted text-muted-foreground border-border/60",
  critical: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
};

// ============================================================================
// Utility Functions
// ============================================================================

function resolveValue(source: GridValue, path: string | undefined): unknown {
  if (!path) return undefined;
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

function startCase(value: string | undefined): string {
  if (!value) return "";
  return value
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (match) => match.toUpperCase());
}

function getInitials(
  firstName: string | null,
  lastName: string | null,
  fallbackLabel: string
): string {
  const parts: string[] = [];
  const first = firstName?.trim();
  const last = lastName?.trim();
  if (first) parts.push(first);
  if (last) parts.push(last);
  if (parts.length === 0) {
    const tokens = fallbackLabel.split(/\s+/).map((t) => t.trim()).filter(Boolean);
    if (tokens.length > 0) {
      parts.push(tokens[0]);
      if (tokens.length > 1) parts.push(tokens[tokens.length - 1]);
    }
  }
  const initials = parts.map((part) => part.charAt(0).toUpperCase()).filter(Boolean).slice(0, 2).join("");
  return initials || fallbackLabel.trim().charAt(0).toUpperCase() || "?";
}

function getRowIdentifier(row: GridValue): string {
  return String(row.id ?? row.ID ?? row.uuid ?? "");
}

// ============================================================================
// Cell Renderers
// ============================================================================

interface BadgeCellProps extends ICellRendererParams {
  colConfig: GridColumnConfig;
}

function BadgeCellRenderer({ value, data, colConfig }: BadgeCellProps) {
  if (!value) {
    return <span className="text-muted-foreground/50">—</span>;
  }
  const variantField = colConfig.badgeVariantField ?? `${colConfig.field}Variant`;
  const variant = String(resolveValue(data, variantField) ?? "neutral");
  const badgeLabel = colConfig.badgeMap?.[String(value)] ?? String(value);
  return (
    <Badge variant="outline" className={cn("border font-medium", badgeVariants[variant] ?? badgeVariants.neutral)}>
      {badgeLabel}
    </Badge>
  );
}

interface CurrencyCellProps extends ICellRendererParams {
  colConfig: GridColumnConfig;
}

function CurrencyCellRenderer({ value, colConfig }: CurrencyCellProps) {
  const amount = Number(value);
  if (Number.isNaN(amount)) {
    return <span className="text-muted-foreground/50">—</span>;
  }
  const currency = colConfig.currency?.currency ?? "PHP";
  const notation = colConfig.currency?.notation ?? "standard";
  return (
    <span className="font-medium tabular-nums">
      {new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        notation,
        maximumFractionDigits: notation === "compact" ? 1 : 0,
      }).format(amount)}
    </span>
  );
}

interface DateCellProps extends ICellRendererParams {
  colConfig: GridColumnConfig;
}

function DateCellRenderer({ value, colConfig }: DateCellProps) {
  if (!value) {
    return <span className="text-muted-foreground/50">—</span>;
  }
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return (
    <span className="text-muted-foreground">
      {new Intl.DateTimeFormat("en-US", colConfig.dateFormat ?? {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date)}
    </span>
  );
}

interface ChipListCellProps extends ICellRendererParams {
  colConfig: GridColumnConfig;
}

function ChipListCellRenderer({ value }: ChipListCellProps) {
  const list = Array.isArray(value) ? value : [];
  if (list.length === 0) {
    return <span className="text-muted-foreground/50">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.slice(0, 3).map((item: unknown, index: number) => (
        <Badge key={`${String(item)}-${index}`} variant="secondary" className="text-xs bg-muted/60">
          {String(item)}
        </Badge>
      ))}
      {list.length > 3 && (
        <Badge variant="secondary" className="text-xs bg-muted/60">
          +{list.length - 3}
        </Badge>
      )}
    </div>
  );
}

interface LinkCellProps extends ICellRendererParams {
  colConfig: GridColumnConfig;
}

function LinkCellRenderer({ value, data, colConfig }: LinkCellProps) {
  const subtitleField = colConfig.subtitleField;
  const subtitleRaw = subtitleField ? resolveValue(data, subtitleField) : null;
  const subtitle = subtitleRaw == null ? null : String(subtitleRaw);
  const href = colConfig.hrefTemplate
    ? applyTemplate(colConfig.hrefTemplate, data)
    : value ? String(value) : "#";
  const label = value == null ? "—" : String(value);

  if (colConfig.avatarField || colConfig.avatarFirstNameField || colConfig.avatarLastNameField) {
    const avatarSrcRaw = colConfig.avatarField ? resolveValue(data, colConfig.avatarField) : null;
    const firstNameRaw = colConfig.avatarFirstNameField ? resolveValue(data, colConfig.avatarFirstNameField) : null;
    const lastNameRaw = colConfig.avatarLastNameField ? resolveValue(data, colConfig.avatarLastNameField) : null;
    const avatarSrc = typeof avatarSrcRaw === "string" && avatarSrcRaw.trim() ? avatarSrcRaw : null;
    const initials = getInitials(
      typeof firstNameRaw === "string" ? firstNameRaw : null,
      typeof lastNameRaw === "string" ? lastNameRaw : null,
      label
    );
    return (
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 border-2 border-background shadow-sm ring-1 ring-border/40">
          <AvatarImage src={avatarSrc ?? undefined} alt={label} className="object-cover" />
          <AvatarFallback className="text-xs font-semibold uppercase bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col min-w-0">
          <Link
            href={href}
            className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate"
            prefetch={false}
          >
            {label}
          </Link>
          {subtitle && <span className="text-xs text-muted-foreground truncate">{subtitle}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-w-0">
      <Link
        href={href}
        className="text-sm font-semibold text-primary hover:underline truncate inline-flex items-center gap-1 group"
        prefetch={false}
      >
        {label}
      </Link>
      {subtitle && <span className="text-xs text-muted-foreground truncate">{subtitle}</span>}
    </div>
  );
}

interface ActionsCellProps extends ICellRendererParams {
  colConfig: GridColumnConfig;
  onRequestDelete: (rowId: string, row: GridValue, action: GridActionConfig) => void;
}

const actionIntentIcons: Record<string, React.ReactNode> = {
  view: <Eye className="h-3.5 w-3.5" />,
  edit: <Edit className="h-3.5 w-3.5" />,
  delete: <Trash2 className="h-3.5 w-3.5" />,
  link: <ExternalLink className="h-3.5 w-3.5" />,
};

function ActionsCellRenderer({ data, colConfig, onRequestDelete }: ActionsCellProps) {
  const actions = normalizeList<GridActionConfig>(colConfig.actions);
  const rowId = getRowIdentifier(data);

  if (!actions.length) return null;

  return (
    <div className="flex items-center gap-1">
      {actions.map((action) => {
        const intent = action.intent ?? "link";
        const href = action.urlTemplate ? applyTemplate(action.urlTemplate, data) : "#";
        const icon = actionIntentIcons[intent];

        if (intent === "delete") {
          return (
            <Button
              key={action.id ?? `${rowId}-delete`}
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-300 gap-1"
              onClick={() => onRequestDelete(rowId, data, action)}
            >
              {icon}
              <span className="text-xs">{action.label}</span>
            </Button>
          );
        }

        const variant = action.variant ?? (intent === "view" ? "ghost" : intent === "edit" ? "secondary" : "ghost");

        return (
          <Link
            key={action.id ?? `${rowId}-${action.label}`}
            href={href}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-all whitespace-nowrap",
              variant === "secondary"
                ? "border border-border/60 bg-background hover:bg-muted/50 hover:border-border"
                : "text-primary hover:bg-primary/10"
            )}
            prefetch={false}
          >
            {icon}
            <span>{action.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

// ============================================================================
// Filter Input Component
// ============================================================================

function FilterInput({
  filter,
  value,
  onChange,
}: {
  filter: GridFilterConfig;
  value: string | DateRange | undefined;
  onChange: (value: string | DateRange | undefined) => void;
}) {
  if (filter.type === "select") {
    const options = normalizeList<GridFilterOption>(filter.options);
    const stringValue = typeof value === "string" ? value : "";
    return (
      <div className="flex flex-col gap-1.5 sm:gap-2 min-w-[140px] sm:min-w-[160px]">
        {filter.label && (
          <label className="text-[10px] sm:text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Filter className="h-3 w-3" />
            {filter.label}
          </label>
        )}
        <Select value={stringValue || filter.defaultValue || ""} onValueChange={onChange}>
          <SelectTrigger className="h-9 sm:h-10 text-sm bg-background/50 border-border/60 hover:border-border transition-colors">
            <SelectValue placeholder={filter.placeholder ?? "Choose"} />
          </SelectTrigger>
          <SelectContent>
            {options.filter((option) => option.value !== "").map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (filter.type === "daterange") {
    const rangeValue = (value && typeof value === "object" && "from" in value) ? value as DateRange : undefined;
    return (
      <div className="flex flex-col gap-1.5 sm:gap-2 min-w-[180px] sm:min-w-[200px]">
        {filter.label && (
          <label className="text-[10px] sm:text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Filter className="h-3 w-3" />
            {filter.label}
          </label>
        )}
        <DatePicker
          mode="range"
          value={rangeValue}
          onChange={(range) => onChange(range)}
          placeholder={filter.placeholder ?? "Filter by date"}
          clearable
          closeOnSelect
          className="h-9 sm:h-10 text-sm bg-background/50 border-border/60 hover:border-border transition-colors"
        />
      </div>
    );
  }

  const stringValue = typeof value === "string" ? value : "";
  return (
    <div className="flex flex-col gap-1.5 sm:gap-2 flex-1 min-w-[180px] sm:min-w-[220px] max-w-sm">
      {filter.label && (
        <label className="text-[10px] sm:text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Search className="h-3 w-3" />
          {filter.label}
        </label>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
        <Input
          value={stringValue}
          onChange={(event) => onChange(event.target.value)}
          placeholder={filter.placeholder ?? "Search..."}
          className="h-9 sm:h-10 pl-9 text-sm bg-background/50 border-border/60 hover:border-border focus:border-primary transition-colors"
        />
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function AdminAgGrid(props: AdminAgGridProps) {
  const searchParams = useSearchParams();
  const urlSearchQuery = searchParams.get("search") || "";
  const gridRef = React.useRef<GridApi | null>(null);

  // Normalize props
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
  const rowData = React.useMemo(() => props.rows ?? [], [props.rows]);

  // Filter state
  const getInitialFilterState = React.useCallback(() => {
    const initial: Record<string, string | DateRange | undefined> = {};
    for (const filter of filters) {
      if (filter.defaultValue) {
        initial[filter.id] = filter.defaultValue;
      }
    }
    if (urlSearchQuery) {
      const searchFilter = filters.find((f) => f.type === "search");
      if (searchFilter) {
        initial[searchFilter.id] = urlSearchQuery;
      }
    }
    return initial;
  }, [filters, urlSearchQuery]);

  const [filterState, setFilterState] = React.useState<Record<string, string | DateRange | undefined>>(getInitialFilterState);

  // Update filter state when URL search param changes
  React.useEffect(() => {
    if (urlSearchQuery) {
      const searchFilter = filters.find((f) => f.type === "search");
      if (searchFilter) {
        setFilterState((prev) => ({
          ...prev,
          [searchFilter.id]: urlSearchQuery,
        }));
      }
    }
  }, [urlSearchQuery, filters]);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = React.useState<DeleteConfirmState>({
    isOpen: false,
    isDeleting: false,
    rowId: "",
    row: null,
    action: null,
  });

  const requestDeleteConfirmation = React.useCallback(
    (rowId: string, row: GridValue, action: GridActionConfig) => {
      setDeleteConfirm({
        isOpen: true,
        isDeleting: false,
        rowId,
        row,
        action,
      });
    },
    []
  );

  const handleConfirmDelete = React.useCallback(async () => {
    const { rowId, row, action } = deleteConfirm;
    if (!rowId) return;

    setDeleteConfirm((prev) => ({ ...prev, isDeleting: true }));

    try {
      if (action?.handler) {
        const response = await fetch("/api/metadata/actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: { id: action.handler },
            context: { params: { id: rowId } },
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          toast.error(result.message || "Failed to delete record");
          setDeleteConfirm((prev) => ({ ...prev, isDeleting: false }));
          return;
        }

        const successMsg = action.successMessage
          ? applyTemplate(action.successMessage, row ?? {})
          : "Record deleted successfully";
        toast.success(successMsg);
      } else {
        toast.success("Record removed");
      }

      // Remove from grid
      if (gridRef.current) {
        const rowNode = gridRef.current.getRowNode(rowId);
        if (rowNode) {
          gridRef.current.applyTransaction({ remove: [rowNode.data] });
        }
      }

      setDeleteConfirm({ isOpen: false, isDeleting: false, rowId: "", row: null, action: null });
    } catch (error) {
      console.error("[AdminAgGrid] Delete failed:", error);
      toast.error("An error occurred while deleting the record");
      setDeleteConfirm((prev) => ({ ...prev, isDeleting: false }));
    }
  }, [deleteConfirm]);

  // Convert GridColumnConfig to AG Grid ColDef
  const columnDefs = React.useMemo<ColDef[]>(() => {
    return columns.map((column): ColDef => {
      const field = column.field || column.key || "";
      const headerName = column.headerName || column.label || startCase(field);

      const baseDef: ColDef = {
        field,
        headerName,
        sortable: column.sortable !== false,
        resizable: column.resizable !== false,
        filter: column.filter === true,
        minWidth: column.minWidth ?? 100,
        flex: column.flex ?? (column.width ? undefined : 1),
        width: typeof column.width === "number" ? column.width : undefined,
        headerClass: column.hideOnMobile ? "hidden md:flex" : undefined,
        cellClass: cn(
          column.align === "center" && "text-center",
          column.align === "right" && "text-right",
          column.hideOnMobile && "hidden md:flex"
        ),
      };

      switch (column.type) {
        case "badge":
          return {
            ...baseDef,
            cellRenderer: (params: ICellRendererParams) => (
              <BadgeCellRenderer {...params} colConfig={column} />
            ),
          };

        case "currency":
          return {
            ...baseDef,
            cellRenderer: (params: ICellRendererParams) => (
              <CurrencyCellRenderer {...params} colConfig={column} />
            ),
            comparator: (a: unknown, b: unknown) => Number(a) - Number(b),
          };

        case "date":
          return {
            ...baseDef,
            cellRenderer: (params: ICellRendererParams) => (
              <DateCellRenderer {...params} colConfig={column} />
            ),
            comparator: (a: unknown, b: unknown) => {
              const dateA = a ? new Date(String(a)).getTime() : 0;
              const dateB = b ? new Date(String(b)).getTime() : 0;
              return dateA - dateB;
            },
          };

        case "chip-list":
          return {
            ...baseDef,
            cellRenderer: (params: ICellRendererParams) => (
              <ChipListCellRenderer {...params} colConfig={column} />
            ),
            valueFormatter: (params: ValueFormatterParams) => {
              const list = Array.isArray(params.value) ? params.value : [];
              return list.join(", ");
            },
          };

        case "link":
          return {
            ...baseDef,
            cellRenderer: (params: ICellRendererParams) => (
              <LinkCellRenderer {...params} colConfig={column} />
            ),
          };

        case "actions":
          return {
            ...baseDef,
            headerName: column.headerName ?? "Actions",
            sortable: false,
            filter: false,
            resizable: false,
            pinned: "right",
            minWidth: column.minWidth ?? 200,
            width: typeof column.width === "number" ? column.width : 200,
            flex: 0,
            cellRenderer: (params: ICellRendererParams) => (
              <ActionsCellRenderer
                {...params}
                colConfig={column}
                onRequestDelete={requestDeleteConfirmation}
              />
            ),
          };

        default:
          return {
            ...baseDef,
            valueFormatter: (params: ValueFormatterParams) => {
              if (params.value === null || params.value === undefined) return "—";
              if (Array.isArray(params.value)) return params.value.join(", ");
              return String(params.value);
            },
          };
      }
    });
  }, [columns, requestDeleteConfirmation]);

  // Apply quick filter from search filters
  const quickFilterText = React.useMemo(() => {
    const searchFilter = filters.find((f) => f.type === "search");
    if (!searchFilter) return "";
    const value = filterState[searchFilter.id];
    return typeof value === "string" ? value : "";
  }, [filters, filterState]);

  // Filter row data based on select and daterange filters
  const filteredRowData = React.useMemo(() => {
    const selectFilters = filters.filter((f) => f.type === "select");
    const dateRangeFilters = filters.filter((f) => f.type === "daterange");

    return rowData.filter((row) => {
      // Apply select filters
      for (const filter of selectFilters) {
        const active = filterState[filter.id];
        if (!active || active === "all") continue;
        const field = filter.field ?? filter.id;
        const value = String(resolveValue(row, field) ?? "").toLowerCase();
        if (typeof active === "string" && value !== active.toLowerCase()) {
          return false;
        }
      }

      // Apply date range filters
      for (const filter of dateRangeFilters) {
        const range = filterState[filter.id] as DateRange | undefined;
        if (!range || (!range.from && !range.to)) continue;
        const field = filter.field ?? filter.id;
        const rawValue = resolveValue(row, field);
        if (!rawValue) return false;
        const rowDate = new Date(String(rawValue));
        if (isNaN(rowDate.getTime())) return false;
        const rowDateStart = new Date(rowDate.getFullYear(), rowDate.getMonth(), rowDate.getDate());
        if (range.from) {
          const fromDate = new Date(range.from.getFullYear(), range.from.getMonth(), range.from.getDate());
          if (rowDateStart < fromDate) return false;
        }
        if (range.to) {
          const toDate = new Date(range.to.getFullYear(), range.to.getMonth(), range.to.getDate());
          if (rowDateStart > toDate) return false;
        }
      }

      return true;
    });
  }, [rowData, filters, filterState]);

  // Grid ready handler
  const onGridReady = React.useCallback((event: GridReadyEvent) => {
    gridRef.current = event.api;
  }, []);

  // Export to CSV
  const handleExport = React.useCallback(() => {
    if (!gridRef.current) {
      toast.error("Grid not ready");
      return;
    }
    gridRef.current.exportDataAsCsv({
      fileName: `${props.exportFilename || "export"}-${new Date().toISOString().split("T")[0]}.csv`,
      skipColumnGroupHeaders: true,
      columnKeys: columns
        .filter((c) => c.type !== "actions")
        .map((c) => c.field || c.key || ""),
    });
    toast.success("Data exported successfully");
  }, [columns, props.exportFilename]);

  // Check for active filters
  const hasActiveFilters = Object.values(filterState).some((v) => {
    if (!v) return false;
    if (typeof v === "string") return v.trim().length > 0;
    if (typeof v === "object" && "from" in v) {
      const range = v as DateRange;
      return Boolean(range.from || range.to);
    }
    return true;
  });

  const isEmpty = filteredRowData.length === 0;

  return (
    <section className="space-y-5 sm:space-y-6">
      {/* Header */}
      {(props.title || props.description || topActions.length > 0 || props.exportable || props.headerSlot) && (
        <header className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1.5 sm:space-y-2">
            {props.title && (
              <h2 className="text-lg sm:text-xl font-semibold text-foreground flex items-center gap-2">
                <span className="h-5 w-1 rounded-full bg-primary" />
                {props.title}
              </h2>
            )}
            {props.description && (
              <p className="text-sm text-muted-foreground pl-3">{props.description}</p>
            )}
          </div>
          {(topActions.length > 0 || props.exportable || props.headerSlot) && (
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {topActions.map((action) => renderAction(action, "primary"))}
              {props.headerSlot}
              {props.exportable && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={handleExport}
                  disabled={isEmpty}
                >
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              )}
            </div>
          )}
        </header>
      )}

      {/* Grid Container */}
      <div className="space-y-4 rounded-xl sm:rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-3 sm:p-4 shadow-sm">
        {/* Filters */}
        {filters.length > 0 && (
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between pb-3 border-b border-border/40">
            <div className="flex flex-1 flex-wrap gap-2 sm:gap-3">
              {filters.map((filter) => (
                <FilterInput
                  key={filter.id}
                  filter={filter}
                  value={filterState[filter.id]}
                  onChange={(value) =>
                    setFilterState((prev) => ({ ...prev, [filter.id]: value }))
                  }
                />
              ))}
            </div>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="self-start text-xs sm:text-sm gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => setFilterState({})}
              >
                <X className="h-3.5 w-3.5" />
                Clear filters
              </Button>
            )}
          </div>
        )}

        {/* AG Grid */}
        {!isEmpty ? (
          <DataGrid
            rowData={filteredRowData}
            columnDefs={columnDefs}
            onGridReady={onGridReady}
            getRowId={(params) => getRowIdentifier(params.data)}
            quickFilterText={quickFilterText}
            pagination={props.pagination !== false}
            paginationPageSize={props.paginationPageSize ?? 25}
            paginationPageSizeSelector={props.paginationPageSizeSelector ?? [10, 25, 50, 100]}
            rowHeight={props.rowHeight ?? 56}
            headerHeight={props.headerHeight ?? 48}
            rowSelection={props.rowSelection}
            suppressHorizontalScroll={props.suppressHorizontalScroll}
            domLayout="autoHeight"
            animateRows
            suppressCellFocus
            suppressRowClickSelection
            enableCellTextSelection
            ensureDomOrder
            className="min-h-[300px]"
            style={{ width: "100%" }}
          />
        ) : (
          /* Empty State */
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-8 sm:p-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
                <FileQuestion className="h-6 w-6 text-muted-foreground/60" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">
                  {props.emptyState?.title ?? "No matching records"}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  {props.emptyState?.description ?? "Adjust your filters to see a different segment of the data."}
                </p>
              </div>
              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 gap-1.5"
                  onClick={() => setFilterState({})}
                >
                  <X className="h-3.5 w-3.5" />
                  Clear all filters
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteConfirm.isOpen}
        onOpenChange={(open) => {
          if (!open && !deleteConfirm.isDeleting) {
            setDeleteConfirm({ isOpen: false, isDeleting: false, rowId: "", row: null, action: null });
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/10">
                <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              </div>
              <AlertDialogTitle className="text-lg">
                {deleteConfirm.action?.confirmTitle
                  ? applyTemplate(deleteConfirm.action.confirmTitle, deleteConfirm.row ?? {})
                  : "Delete Record"}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-2 text-muted-foreground">
              {deleteConfirm.action?.confirmDescription
                ? applyTemplate(deleteConfirm.action.confirmDescription, deleteConfirm.row ?? {})
                : deleteConfirm.action?.confirm
                  ? applyTemplate(deleteConfirm.action.confirm, deleteConfirm.row ?? {})
                  : `Are you sure you want to delete "${String(deleteConfirm.row?.name ?? deleteConfirm.row?.title ?? "this record")}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={deleteConfirm.isDeleting} className="mt-0">
              {deleteConfirm.action?.cancelLabel ?? "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteConfirm.isDeleting}
              className="bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-700"
            >
              {deleteConfirm.isDeleting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  {deleteConfirm.action?.confirmLabel ?? "Delete"}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

export default AdminAgGrid;
