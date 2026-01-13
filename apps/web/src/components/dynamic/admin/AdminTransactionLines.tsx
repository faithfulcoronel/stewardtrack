"use client";

import * as React from "react";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
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
import { Badge } from "@/components/ui/badge";

// =============================================================================
// TYPES
// =============================================================================

export interface TransactionLineOption {
  value: string;
  label: string;
  code?: string;
  description?: string;
}

export interface TransactionLine {
  id: string;
  lineNumber: number;
  categoryId: string;
  fundId: string;
  sourceId: string;
  accountId: string;
  amount: number;
  description: string;
  isNew?: boolean;
  isDeleted?: boolean;
  isDirty?: boolean;
}

export interface TransactionLineColumn {
  field: string;
  headerName: string;
  flex?: number;
  width?: number;
  type?: "select" | "currency" | "text" | "textarea";
  required?: boolean;
  optionsKey?: string;
}

export interface AdminTransactionLinesProps {
  title?: string;
  description?: string;
  lines?: TransactionLine[];
  columns?: TransactionLineColumn[];
  categoryOptions?: TransactionLineOption[];
  fundOptions?: TransactionLineOption[];
  sourceOptions?: TransactionLineOption[];
  accountOptions?: TransactionLineOption[];
  totalAmount?: string;
  transactionType?: "income" | "expense";
  currency?: string;
  onLinesChange?: (lines: TransactionLine[]) => void;
  onTotalChange?: (total: number) => void;
  readOnly?: boolean;
  minLines?: number;
  maxLines?: number;
}

// =============================================================================
// UTILS
// =============================================================================

// Special value for "none" selection (empty string not allowed in Select)
const NONE_VALUE = "__none__";

function generateLineId(): string {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function toSelectValue(value: string): string {
  return value || NONE_VALUE;
}

function fromSelectValue(value: string): string {
  return value === NONE_VALUE ? "" : value;
}

function createEmptyLine(lineNumber: number): TransactionLine {
  return {
    id: generateLineId(),
    lineNumber,
    categoryId: "",
    fundId: "",
    sourceId: "",
    accountId: "",
    amount: 0,
    description: "",
    isNew: true,
    isDirty: false,
  };
}

function formatCurrencyInput(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function parseCurrencyInput(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, "");
  const parsed = parseFloat(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
}

// =============================================================================
// LINE CARD (MOBILE VIEW)
// =============================================================================

interface LineCardProps {
  line: TransactionLine;
  index: number;
  categoryOptions: TransactionLineOption[];
  fundOptions: TransactionLineOption[];
  sourceOptions: TransactionLineOption[];
  accountOptions: TransactionLineOption[];
  currency: string;
  readOnly: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (field: keyof TransactionLine, value: unknown) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

function LineCard({
  line,
  index,
  categoryOptions,
  fundOptions,
  sourceOptions,
  accountOptions,
  currency,
  readOnly,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onDelete,
  onDuplicate,
}: LineCardProps) {
  const categoryLabel = categoryOptions.find((o) => o.value === line.categoryId)?.label || "Select category";
  const fundLabel = fundOptions.find((o) => o.value === line.fundId)?.label || "—";

  return (
    <div
      className={cn(
        "rounded-2xl border bg-background shadow-sm transition-all",
        line.isDeleted && "opacity-50",
        line.isDirty && "border-amber-500/50",
        line.isNew && "border-primary/50"
      )}
    >
      {/* Card Header - Always Visible */}
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 p-4"
        onClick={onToggleExpand}
        disabled={readOnly}
      >
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-muted text-sm font-semibold">
            {index + 1}
          </div>
          <div className="text-left">
            <div className="font-medium text-foreground">
              {categoryLabel}
            </div>
            <div className="text-sm text-muted-foreground">
              {fundLabel} {line.description && `• ${line.description.slice(0, 30)}${line.description.length > 30 ? "..." : ""}`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="font-semibold text-foreground tabular-nums">
              {formatCurrencyInput(line.amount, currency)}
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="size-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && !readOnly && (
        <div className="space-y-4 border-t px-4 pb-4 pt-4">
          {/* Amount - Prominent Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Amount *
            </label>
            <Input
              type="text"
              inputMode="decimal"
              value={line.amount === 0 ? "" : line.amount.toString()}
              onChange={(e) => onUpdate("amount", parseCurrencyInput(e.target.value))}
              placeholder="0.00"
              className="h-12 text-lg font-semibold tabular-nums"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Category *
            </label>
            <Select
              value={line.categoryId}
              onValueChange={(value) => onUpdate("categoryId", value)}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      {option.code && (
                        <span className="text-xs text-muted-foreground">{option.code}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fund & Source - Side by Side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Fund
              </label>
              <Select
                value={toSelectValue(line.fundId)}
                onValueChange={(value) => onUpdate("fundId", fromSelectValue(value))}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>None</SelectItem>
                  {fundOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Source
              </label>
              <Select
                value={toSelectValue(line.sourceId)}
                onValueChange={(value) => onUpdate("sourceId", fromSelectValue(value))}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>None</SelectItem>
                  {sourceOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Account (Bank/Cash) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Account
            </label>
            <Select
              value={toSelectValue(line.accountId)}
              onValueChange={(value) => onUpdate("accountId", fromSelectValue(value))}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>None</SelectItem>
                {accountOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Description
            </label>
            <Textarea
              value={line.description}
              onChange={(e) => onUpdate("description", e.target.value)}
              placeholder="Line item description..."
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between border-t pt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDuplicate}
              className="text-muted-foreground"
            >
              <Copy className="mr-2 size-4" />
              Duplicate
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="mr-2 size-4" />
              Remove
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// LINE ROW (DESKTOP TABLE VIEW)
// =============================================================================

interface LineRowProps {
  line: TransactionLine;
  index: number;
  categoryOptions: TransactionLineOption[];
  fundOptions: TransactionLineOption[];
  sourceOptions: TransactionLineOption[];
  accountOptions: TransactionLineOption[];
  currency: string;
  readOnly: boolean;
  onUpdate: (field: keyof TransactionLine, value: unknown) => void;
  onDelete: () => void;
}

function LineRow({
  line,
  index,
  categoryOptions,
  fundOptions,
  sourceOptions,
  accountOptions,
  currency,
  readOnly,
  onUpdate,
  onDelete,
}: LineRowProps) {
  const [amountFocused, setAmountFocused] = React.useState(false);
  const [displayAmount, setDisplayAmount] = React.useState(
    line.amount === 0 ? "" : line.amount.toString()
  );

  React.useEffect(() => {
    if (!amountFocused) {
      setDisplayAmount(line.amount === 0 ? "" : line.amount.toString());
    }
  }, [line.amount, amountFocused]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDisplayAmount(raw);
    const parsed = parseCurrencyInput(raw);
    onUpdate("amount", parsed);
  };

  const handleAmountBlur = () => {
    setAmountFocused(false);
    setDisplayAmount(line.amount === 0 ? "" : line.amount.toFixed(2));
  };

  return (
    <tr
      className={cn(
        "group border-b border-border/40 transition-colors hover:bg-muted/30",
        line.isDeleted && "opacity-50 line-through",
        line.isDirty && "bg-amber-500/5",
        line.isNew && "bg-primary/5"
      )}
    >
      {/* Line Number */}
      <td className="w-12 px-2 py-2 text-center">
        <div className="flex items-center justify-center gap-1">
          {!readOnly && (
            <GripVertical className="size-4 cursor-grab text-muted-foreground/50 opacity-0 group-hover:opacity-100" />
          )}
          <span className="text-sm font-medium text-muted-foreground">{index + 1}</span>
        </div>
      </td>

      {/* Category */}
      <td className="px-2 py-2">
        <Select
          value={line.categoryId}
          onValueChange={(value) => onUpdate("categoryId", value)}
          disabled={readOnly}
        >
          <SelectTrigger className="h-9 border-transparent bg-transparent hover:border-border focus:border-border">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categoryOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  {option.code && (
                    <span className="text-xs text-muted-foreground">{option.code}</span>
                  )}
                  <span>{option.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>

      {/* Fund */}
      <td className="px-2 py-2">
        <Select
          value={toSelectValue(line.fundId)}
          onValueChange={(value) => onUpdate("fundId", fromSelectValue(value))}
          disabled={readOnly}
        >
          <SelectTrigger className="h-9 border-transparent bg-transparent hover:border-border focus:border-border">
            <SelectValue placeholder="Fund" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>—</SelectItem>
            {fundOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>

      {/* Source */}
      <td className="px-2 py-2">
        <Select
          value={toSelectValue(line.sourceId)}
          onValueChange={(value) => onUpdate("sourceId", fromSelectValue(value))}
          disabled={readOnly}
        >
          <SelectTrigger className="h-9 border-transparent bg-transparent hover:border-border focus:border-border">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>—</SelectItem>
            {sourceOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>

      {/* Amount */}
      <td className="w-32 px-2 py-2">
        <Input
          type="text"
          inputMode="decimal"
          value={amountFocused ? displayAmount : (line.amount === 0 ? "" : formatCurrencyInput(line.amount, currency).replace(/^\$/, ""))}
          onChange={handleAmountChange}
          onFocus={() => setAmountFocused(true)}
          onBlur={handleAmountBlur}
          placeholder="0.00"
          disabled={readOnly}
          className="h-9 border-transparent bg-transparent text-right font-medium tabular-nums hover:border-border focus:border-border"
        />
      </td>

      {/* Description */}
      <td className="px-2 py-2">
        <Input
          type="text"
          value={line.description}
          onChange={(e) => onUpdate("description", e.target.value)}
          placeholder="Description"
          disabled={readOnly}
          className="h-9 border-transparent bg-transparent hover:border-border focus:border-border"
        />
      </td>

      {/* Actions */}
      <td className="w-12 px-2 py-2 text-center">
        {!readOnly && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="size-8 text-muted-foreground opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
          >
            <Trash2 className="size-4" />
            <span className="sr-only">Delete line</span>
          </Button>
        )}
      </td>
    </tr>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AdminTransactionLines({
  title,
  description,
  lines: initialLines = [],
  categoryOptions = [],
  fundOptions = [],
  sourceOptions = [],
  accountOptions = [],
  currency = "USD",
  transactionType = "income",
  onLinesChange,
  onTotalChange,
  readOnly = false,
  minLines = 1,
  maxLines = 50,
}: AdminTransactionLinesProps) {
  const [lines, setLines] = React.useState<TransactionLine[]>(() => {
    if (initialLines.length > 0) {
      return initialLines;
    }
    return [createEmptyLine(1)];
  });

  const [expandedLineId, setExpandedLineId] = React.useState<string | null>(
    lines.length === 1 ? lines[0].id : null
  );
  const [deleteConfirm, setDeleteConfirm] = React.useState<{
    isOpen: boolean;
    lineId: string;
  }>({ isOpen: false, lineId: "" });

  // Calculate total
  const total = React.useMemo(() => {
    return lines
      .filter((line) => !line.isDeleted)
      .reduce((sum, line) => sum + (line.amount || 0), 0);
  }, [lines]);

  // Notify parent of changes
  React.useEffect(() => {
    onLinesChange?.(lines.filter((l) => !l.isDeleted));
  }, [lines, onLinesChange]);

  React.useEffect(() => {
    onTotalChange?.(total);
  }, [total, onTotalChange]);

  // Sync with initial lines when they change
  React.useEffect(() => {
    if (initialLines.length > 0) {
      setLines(initialLines);
    }
  }, [initialLines]);

  const activeLines = lines.filter((l) => !l.isDeleted);
  const canAddLine = activeLines.length < maxLines;
  const canDeleteLine = activeLines.length > minLines;

  const handleAddLine = () => {
    if (!canAddLine) {
      toast.error(`Maximum ${maxLines} lines allowed`);
      return;
    }

    const newLine = createEmptyLine(activeLines.length + 1);
    setLines((prev) => [...prev, newLine]);
    setExpandedLineId(newLine.id);
    toast.success("Line added");
  };

  const handleDuplicateLine = (lineId: string) => {
    if (!canAddLine) {
      toast.error(`Maximum ${maxLines} lines allowed`);
      return;
    }

    const sourceLine = lines.find((l) => l.id === lineId);
    if (!sourceLine) return;

    const newLine: TransactionLine = {
      ...sourceLine,
      id: generateLineId(),
      lineNumber: activeLines.length + 1,
      isNew: true,
      isDirty: false,
    };

    setLines((prev) => [...prev, newLine]);
    setExpandedLineId(newLine.id);
    toast.success("Line duplicated");
  };

  const handleUpdateLine = (lineId: string, field: keyof TransactionLine, value: unknown) => {
    setLines((prev) =>
      prev.map((line) =>
        line.id === lineId
          ? { ...line, [field]: value, isDirty: true }
          : line
      )
    );
  };

  const handleDeleteLine = (lineId: string) => {
    if (!canDeleteLine) {
      toast.error(`At least ${minLines} line required`);
      return;
    }

    const line = lines.find((l) => l.id === lineId);
    if (!line) return;

    if (line.isNew) {
      // New lines can be removed directly
      setLines((prev) => prev.filter((l) => l.id !== lineId));
    } else {
      // Existing lines are marked as deleted
      setLines((prev) =>
        prev.map((l) =>
          l.id === lineId ? { ...l, isDeleted: true } : l
        )
      );
    }

    setDeleteConfirm({ isOpen: false, lineId: "" });
    toast.success("Line removed");
  };

  const requestDeleteLine = (lineId: string) => {
    const line = lines.find((l) => l.id === lineId);
    if (!line) return;

    // If line has data, ask for confirmation
    if (line.amount > 0 || line.categoryId || line.description) {
      setDeleteConfirm({ isOpen: true, lineId });
    } else {
      handleDeleteLine(lineId);
    }
  };

  return (
    <section className="space-y-4">
      {/* Header */}
      {(title || description) && (
        <header className="space-y-1">
          {title && <h3 className="text-lg font-semibold text-foreground">{title}</h3>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </header>
      )}

      {/* Transaction Type Badge */}
      <div className="flex items-center justify-between">
        <Badge
          variant="outline"
          className={cn(
            "border",
            transactionType === "income"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
              : "border-rose-500/30 bg-rose-500/10 text-rose-600"
          )}
        >
          {transactionType === "income" ? "Income" : "Expense"} Entry
        </Badge>
        <div className="text-sm text-muted-foreground">
          {activeLines.length} {activeLines.length === 1 ? "line" : "lines"}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-background shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="w-12 px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  #
                </th>
                <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Category *
                </th>
                <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Fund
                </th>
                <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Source
                </th>
                <th className="w-32 px-2 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Amount *
                </th>
                <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Description
                </th>
                <th className="w-12 px-2 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {lines
                .filter((l) => !l.isDeleted)
                .map((line, index) => (
                  <LineRow
                    key={line.id}
                    line={line}
                    index={index}
                    categoryOptions={categoryOptions}
                    fundOptions={fundOptions}
                    sourceOptions={sourceOptions}
                    accountOptions={accountOptions}
                    currency={currency}
                    readOnly={readOnly}
                    onUpdate={(field, value) => handleUpdateLine(line.id, field, value)}
                    onDelete={() => requestDeleteLine(line.id)}
                  />
                ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border/60 bg-muted/20">
                <td colSpan={4} className="px-4 py-3">
                  {!readOnly && canAddLine && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleAddLine}
                      className="text-primary"
                    >
                      <Plus className="mr-2 size-4" />
                      Add line
                    </Button>
                  )}
                </td>
                <td className="px-2 py-3 text-right">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Total
                  </div>
                  <div className="text-lg font-bold tabular-nums text-foreground">
                    {formatCurrencyInput(total, currency)}
                  </div>
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Mobile Card View - hidden for now */}
      <div className="hidden space-y-3">
        {lines
          .filter((l) => !l.isDeleted)
          .map((line, index) => (
            <LineCard
              key={line.id}
              line={line}
              index={index}
              categoryOptions={categoryOptions}
              fundOptions={fundOptions}
              sourceOptions={sourceOptions}
              accountOptions={accountOptions}
              currency={currency}
              readOnly={readOnly}
              isExpanded={expandedLineId === line.id}
              onToggleExpand={() =>
                setExpandedLineId(expandedLineId === line.id ? null : line.id)
              }
              onUpdate={(field, value) => handleUpdateLine(line.id, field, value)}
              onDelete={() => requestDeleteLine(line.id)}
              onDuplicate={() => handleDuplicateLine(line.id)}
            />
          ))}

        {/* Add Line Button (Mobile) */}
        {!readOnly && canAddLine && (
          <Button
            type="button"
            variant="outline"
            onClick={handleAddLine}
            className="w-full gap-2 rounded-2xl border-dashed py-6"
          >
            <Plus className="size-5" />
            Add line item
          </Button>
        )}

        {/* Total Card (Mobile) */}
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total Amount</span>
            <span className="text-2xl font-bold tabular-nums text-foreground">
              {formatCurrencyInput(total, currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {activeLines.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/60 bg-muted/30 p-8 text-center">
          <h3 className="text-base font-semibold text-foreground">No line items</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Add at least one line item to record this transaction.
          </p>
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              onClick={handleAddLine}
              className="mt-4"
            >
              <Plus className="mr-2 size-4" />
              Add first line
            </Button>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteConfirm.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteConfirm({ isOpen: false, lineId: "" });
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove line item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the line item from the transaction. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteLine(deleteConfirm.lineId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

export default AdminTransactionLines;
