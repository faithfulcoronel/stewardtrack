"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save, X, ArrowUpCircle, ArrowDownCircle, Check, ChevronsUpDown, CalendarIcon, Clock, CheckCircle2, Ban, Lock, RotateCcw, ArrowLeft, Send, Loader2, Upload, Download, ArrowLeftRight, RefreshCw, Sliders, ArrowRightLeft, Undo2, PlayCircle, StopCircle, Share2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useExcelImport, type ExcelImportConfig } from "@/hooks/useExcelImport";
import { ExcelImportDialog, type ExcelImportDialogColumn } from "@/components/ui/excel-import-dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

// =============================================================================
// TYPES
// =============================================================================

// All supported transaction types
export type ExtendedTransactionType =
  | "income"
  | "expense"
  | "transfer"
  | "fund_rollover"
  | "adjustment"
  | "reclass"
  | "refund"
  | "opening_balance"
  | "closing_entry"
  | "reversal"
  | "allocation";

export interface TransactionLineOption {
  value: string;
  label: string;
  code?: string;
  description?: string;
  type?: string; // Category type for filtering (income_transaction, expense_transaction)
}

export interface TransactionLine {
  id: string;
  lineNumber: number;
  accountId: string;
  categoryId: string;
  fundId: string;
  sourceId: string;
  budgetId: string;
  amount: number;
  description: string;
  isNew?: boolean;
  isDirty?: boolean;
  // Extended fields for different transaction types
  destinationSourceId?: string; // For transfer
  destinationFundId?: string; // For fund_rollover
  fromCoaId?: string; // For reclass
  toCoaId?: string; // For reclass
}

export interface TransactionInitialData {
  transactionId?: string;
  transactionType?: ExtendedTransactionType;
  transactionDate?: string;
  reference?: string;
  description?: string;
  status?: string;
  // Extended header fields
  destinationSourceId?: string;
  destinationFundId?: string;
  referenceTransactionId?: string;
  adjustmentReason?: string;
  lines?: {
    id?: string;
    accountId?: string;
    categoryId?: string;
    fundId?: string;
    sourceId?: string;
    budgetId?: string;
    amount?: number;
    description?: string;
    destinationSourceId?: string;
    destinationFundId?: string;
    fromCoaId?: string;
    toCoaId?: string;
  }[];
}

export interface AdminTransactionEntryProps {
  // Header data
  eyebrow?: string;
  headline?: string;
  pageDescription?: string;
  // Dropdown options
  accountOptions?: TransactionLineOption[];
  categoryOptions?: TransactionLineOption[];
  fundOptions?: TransactionLineOption[];
  sourceOptions?: TransactionLineOption[];
  budgetOptions?: TransactionLineOption[];
  coaOptions?: TransactionLineOption[]; // For reclass
  postedTransactions?: TransactionLineOption[]; // For reversal
  // Settings
  currency?: string;
  defaultTransactionType?: ExtendedTransactionType;
  // Initial data for editing existing transactions
  initialData?: TransactionInitialData;
  // Actions
  submitHandler?: string;
  cancelUrl?: string;
}

// =============================================================================
// UTILS
// =============================================================================

function generateLineId(): string {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createEmptyLine(lineNumber: number): TransactionLine {
  return {
    id: generateLineId(),
    lineNumber,
    accountId: "",
    categoryId: "",
    fundId: "",
    sourceId: "",
    budgetId: "",
    amount: 0,
    description: "",
    isNew: true,
    isDirty: false,
  };
}

function formatCurrency(value: number, currency = "USD"): string {
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

// Transaction type configuration with groups
const TRANSACTION_TYPE_GROUPS = [
  {
    label: "Common",
    types: [
      { value: "income" as ExtendedTransactionType, label: "Income", icon: ArrowDownCircle, color: "emerald" },
      { value: "expense" as ExtendedTransactionType, label: "Expense", icon: ArrowUpCircle, color: "rose" },
    ],
  },
  {
    label: "Transfers",
    types: [
      { value: "transfer" as ExtendedTransactionType, label: "Transfer", icon: ArrowLeftRight, color: "blue" },
      { value: "fund_rollover" as ExtendedTransactionType, label: "Fund Rollover", icon: RefreshCw, color: "violet" },
    ],
  },
  {
    label: "Adjustments",
    types: [
      { value: "adjustment" as ExtendedTransactionType, label: "Adjustment", icon: Sliders, color: "amber" },
      { value: "reclass" as ExtendedTransactionType, label: "Reclass", icon: ArrowRightLeft, color: "orange" },
      { value: "refund" as ExtendedTransactionType, label: "Refund", icon: Undo2, color: "pink" },
    ],
  },
  {
    label: "Period-End",
    types: [
      { value: "opening_balance" as ExtendedTransactionType, label: "Opening Balance", icon: PlayCircle, color: "cyan" },
      { value: "closing_entry" as ExtendedTransactionType, label: "Closing Entry", icon: StopCircle, color: "slate" },
    ],
  },
  {
    label: "Corrections",
    types: [
      { value: "reversal" as ExtendedTransactionType, label: "Reversal", icon: RotateCcw, color: "red" },
      { value: "allocation" as ExtendedTransactionType, label: "Allocation", icon: Share2, color: "indigo" },
    ],
  },
];

// Helper to get transaction type config
function getTransactionTypeConfig(type: ExtendedTransactionType) {
  for (const group of TRANSACTION_TYPE_GROUPS) {
    const found = group.types.find((t) => t.value === type);
    if (found) return found;
  }
  return TRANSACTION_TYPE_GROUPS[0].types[0]; // Default to income
}

// Helper to determine which fields are required for each transaction type
function getRequiredFieldsForType(type: ExtendedTransactionType) {
  switch (type) {
    case "income":
    case "expense":
      return { category: true, fund: true, source: true };
    case "transfer":
      return { source: true, destinationSource: true, fund: false };
    case "fund_rollover":
      return { fund: true, destinationFund: true, source: false };
    case "adjustment":
      return { category: true, fund: true, source: true, reason: true };
    case "reclass":
      return { fund: true, fromCoa: true, toCoa: true };
    case "refund":
      return { category: true, fund: true, source: true };
    case "opening_balance":
      return { fund: true, source: true };
    case "closing_entry":
      return { fund: true };
    case "reversal":
      return { referenceTransaction: true };
    case "allocation":
      return { fund: true, destinationFund: true };
    default:
      return { category: true, fund: true, source: true };
  }
}

// Helper to get transaction type description
function getTransactionTypeDescription(type: ExtendedTransactionType): string {
  switch (type) {
    case "income":
      return "Enter details for incoming funds and donations.";
    case "expense":
      return "Enter details for outgoing payments and expenses.";
    case "transfer":
      return "Transfer funds between financial sources (bank accounts, cash).";
    case "fund_rollover":
      return "Move balances from one fund to another.";
    case "adjustment":
      return "Record adjustments to account balances.";
    case "reclass":
      return "Reclassify amounts between chart of accounts.";
    case "refund":
      return "Record refunds for previously recorded income.";
    case "opening_balance":
      return "Set opening balances for a new fiscal period.";
    case "closing_entry":
      return "Record period-end closing entries.";
    case "reversal":
      return "Reverse a previously posted transaction.";
    case "allocation":
      return "Allocate costs between funds.";
    default:
      return "Enter transaction details below.";
  }
}

// Helper to get color classes based on transaction type color
function getColorClasses(color: string, isSelected: boolean): { selected: string; hover: string; icon: string } {
  const colorMap: Record<string, { selected: string; hover: string; icon: string }> = {
    emerald: {
      selected: "border-emerald-500 bg-emerald-500/10 text-emerald-700",
      hover: "hover:border-emerald-500/50 hover:bg-emerald-500/5",
      icon: "text-emerald-600",
    },
    rose: {
      selected: "border-rose-500 bg-rose-500/10 text-rose-700",
      hover: "hover:border-rose-500/50 hover:bg-rose-500/5",
      icon: "text-rose-600",
    },
    blue: {
      selected: "border-blue-500 bg-blue-500/10 text-blue-700",
      hover: "hover:border-blue-500/50 hover:bg-blue-500/5",
      icon: "text-blue-600",
    },
    violet: {
      selected: "border-violet-500 bg-violet-500/10 text-violet-700",
      hover: "hover:border-violet-500/50 hover:bg-violet-500/5",
      icon: "text-violet-600",
    },
    amber: {
      selected: "border-amber-500 bg-amber-500/10 text-amber-700",
      hover: "hover:border-amber-500/50 hover:bg-amber-500/5",
      icon: "text-amber-600",
    },
    orange: {
      selected: "border-orange-500 bg-orange-500/10 text-orange-700",
      hover: "hover:border-orange-500/50 hover:bg-orange-500/5",
      icon: "text-orange-600",
    },
    pink: {
      selected: "border-pink-500 bg-pink-500/10 text-pink-700",
      hover: "hover:border-pink-500/50 hover:bg-pink-500/5",
      icon: "text-pink-600",
    },
    cyan: {
      selected: "border-cyan-500 bg-cyan-500/10 text-cyan-700",
      hover: "hover:border-cyan-500/50 hover:bg-cyan-500/5",
      icon: "text-cyan-600",
    },
    slate: {
      selected: "border-slate-500 bg-slate-500/10 text-slate-700",
      hover: "hover:border-slate-500/50 hover:bg-slate-500/5",
      icon: "text-slate-600",
    },
    red: {
      selected: "border-red-500 bg-red-500/10 text-red-700",
      hover: "hover:border-red-500/50 hover:bg-red-500/5",
      icon: "text-red-600",
    },
    indigo: {
      selected: "border-indigo-500 bg-indigo-500/10 text-indigo-700",
      hover: "hover:border-indigo-500/50 hover:bg-indigo-500/5",
      icon: "text-indigo-600",
    },
  };

  return colorMap[color] || colorMap.slate;
}

// Helper to calculate table column span based on transaction type
function getTableColSpan(type: ExtendedTransactionType): number {
  // Base columns: # (1) + Account (1) = 2
  let span = 2;

  // Category column - hide for transfer, fund_rollover, opening_balance, reclass
  if (!["transfer", "fund_rollover", "opening_balance", "reclass"].includes(type)) {
    span += 1;
  }

  // Fund column - hide for transfer
  if (type !== "transfer") {
    span += 1;
  }

  // Source column - hide for fund_rollover, reclass, closing_entry
  if (!["fund_rollover", "reclass", "closing_entry"].includes(type)) {
    span += 1;
  }

  // From/To COA - for reclass only (2 columns)
  if (type === "reclass") {
    span += 2;
  }

  // Budget - expense only
  if (type === "expense") {
    span += 1;
  }

  return span;
}

// Helper to get total color class based on transaction type
function getTotalColorClass(type: ExtendedTransactionType): string {
  const typeConfig = getTransactionTypeConfig(type);
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-600",
    rose: "text-rose-600",
    blue: "text-blue-600",
    violet: "text-violet-600",
    amber: "text-amber-600",
    orange: "text-orange-600",
    pink: "text-pink-600",
    cyan: "text-cyan-600",
    slate: "text-slate-600",
    red: "text-red-600",
    indigo: "text-indigo-600",
  };
  return colorMap[typeConfig.color] || "text-foreground";
}

// Helper to get submit button class based on transaction type
function getSubmitButtonClass(type: ExtendedTransactionType): string {
  const typeConfig = getTransactionTypeConfig(type);
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-600 hover:bg-emerald-700",
    rose: "bg-rose-600 hover:bg-rose-700",
    blue: "bg-blue-600 hover:bg-blue-700",
    violet: "bg-violet-600 hover:bg-violet-700",
    amber: "bg-amber-600 hover:bg-amber-700",
    orange: "bg-orange-600 hover:bg-orange-700",
    pink: "bg-pink-600 hover:bg-pink-700",
    cyan: "bg-cyan-600 hover:bg-cyan-700",
    slate: "bg-slate-600 hover:bg-slate-700",
    red: "bg-red-600 hover:bg-red-700",
    indigo: "bg-indigo-600 hover:bg-indigo-700",
  };
  return colorMap[typeConfig.color] || "bg-primary hover:bg-primary/90";
}

// =============================================================================
// INLINE COMBOBOX COMPONENT
// =============================================================================

interface InlineComboboxProps {
  options: TransactionLineOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  allowClear?: boolean;
  disabled?: boolean;
}

function InlineCombobox({
  options,
  value,
  onChange,
  placeholder = "Select...",
  emptyMessage = "No results found.",
  allowClear = false,
  disabled = false,
}: InlineComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const selectedOption = React.useMemo(() => {
    return options.find((option) => option.value === value);
  }, [options, value]);

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return options;
    }
    const query = searchQuery.toLowerCase();
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(query) ||
        option.code?.toLowerCase().includes(query) ||
        option.description?.toLowerCase().includes(query)
    );
  }, [options, searchQuery]);

  const handleSelect = React.useCallback(
    (selectedValue: string) => {
      onChange(selectedValue === value ? "" : selectedValue);
      setOpen(false);
      setSearchQuery("");
    },
    [onChange, value]
  );

  const handleClear = React.useCallback(() => {
    onChange("");
    setOpen(false);
  }, [onChange]);

  return (
    <Popover open={!disabled && open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-between border-transparent bg-transparent px-2 text-left font-normal hover:border-border hover:bg-transparent focus:border-border",
            !selectedOption && "text-muted-foreground",
            disabled && "cursor-not-allowed opacity-60 hover:border-transparent"
          )}
        >
          <span className="truncate text-sm">
            {selectedOption ? (
              <span className="flex items-center gap-1.5">
                {selectedOption.code && (
                  <span className="text-xs text-muted-foreground">{selectedOption.code}</span>
                )}
                <span>{selectedOption.label}</span>
              </span>
            ) : (
              placeholder
            )}
          </span>
          <ChevronsUpDown className="ml-1 size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[300px] p-0"
        align="start"
        side="bottom"
        sideOffset={4}
        collisionPadding={16}
        avoidCollisions={true}
      >
        <Command shouldFilter={false} className="flex flex-col">
          {/* Search input - sticky at top */}
          <div className="border-b bg-background p-2">
            <div className="flex items-center rounded-md border bg-muted/50 px-3">
              <input
                type="text"
                placeholder="Type to search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="ml-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>
          {/* Options list */}
          <CommandList className="max-h-[240px] overflow-y-auto">
            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </CommandEmpty>
            <CommandGroup>
              {allowClear && value && (
                <CommandItem
                  onSelect={handleClear}
                  className="text-muted-foreground"
                >
                  <X className="mr-2 size-3.5" />
                  Clear selection
                </CommandItem>
              )}
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={handleSelect}
                  className="flex items-center gap-2 py-2"
                >
                  <Check
                    className={cn(
                      "size-4 shrink-0",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col overflow-hidden">
                    <span className="flex items-center gap-1.5 truncate">
                      {option.code && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                          {option.code}
                        </span>
                      )}
                      <span className="truncate">{option.label}</span>
                    </span>
                    {option.description && (
                      <span className="truncate text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AdminTransactionEntry({
  eyebrow = "Finance",
  headline: _headline = "Record Transaction",
  pageDescription: _pageDescription = "Enter income or expense transaction details.",
  accountOptions = [],
  categoryOptions = [],
  fundOptions = [],
  sourceOptions = [],
  budgetOptions = [],
  coaOptions = [],
  postedTransactions = [],
  currency = "USD",
  defaultTransactionType = "income",
  initialData,
  cancelUrl = "/admin/finance/transactions",
}: AdminTransactionEntryProps) {
  const router = useRouter();

  // Helper to convert initial lines to TransactionLine format
  const convertInitialLines = React.useCallback((initLines?: TransactionInitialData["lines"]): TransactionLine[] => {
    if (!initLines || initLines.length === 0) {
      return [createEmptyLine(1)];
    }
    return initLines.map((line, index) => ({
      id: line.id || generateLineId(),
      lineNumber: index + 1,
      accountId: line.accountId || "",
      categoryId: line.categoryId || "",
      fundId: line.fundId || "",
      sourceId: line.sourceId || "",
      budgetId: line.budgetId || "",
      amount: line.amount || 0,
      description: line.description || "",
      isNew: !line.id, // If no id, it's a new line
      isDirty: false,  // Existing lines start as not dirty
    }));
  }, []);

  // Form state - initialize from initialData if provided
  const [transactionId, _setTransactionId] = React.useState<string | undefined>(initialData?.transactionId);
  const [transactionType, setTransactionType] = React.useState<ExtendedTransactionType>(
    initialData?.transactionType || defaultTransactionType
  );

  // Extended transaction type fields
  const [destinationSourceId, setDestinationSourceId] = React.useState<string>(initialData?.destinationSourceId || "");
  const [destinationFundId, setDestinationFundId] = React.useState<string>(initialData?.destinationFundId || "");
  const [referenceTransactionId, setReferenceTransactionId] = React.useState<string>(initialData?.referenceTransactionId || "");
  const [adjustmentReason, setAdjustmentReason] = React.useState<string>(initialData?.adjustmentReason || "");
  const [transactionDate, setTransactionDate] = React.useState<Date>(() => {
    if (initialData?.transactionDate) {
      return new Date(initialData.transactionDate);
    }
    return new Date();
  });
  const [datePickerOpen, setDatePickerOpen] = React.useState(false);
  const [reference, setReference] = React.useState(initialData?.reference || "");
  const [description, setDescription] = React.useState(initialData?.description || "");
  const [lines, setLines] = React.useState<TransactionLine[]>(() => convertInitialLines(initialData?.lines));
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitProgress, setSubmitProgress] = React.useState(0);
  const [submitStatus, setSubmitStatus] = React.useState("");

  // Warn user if they try to leave while submitting
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSubmitting) {
        e.preventDefault();
        // Modern browsers ignore custom messages, but we set it anyway for older ones
        e.returnValue = 'Transaction is being processed. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isSubmitting]);

  // Excel import dialog state
  const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false);

  // Track if we're editing an existing transaction
  const isEditing = Boolean(transactionId);

  // Get current status from initial data
  const currentStatus = initialData?.status as 'draft' | 'submitted' | 'approved' | 'posted' | 'voided' | undefined;

  // Determine what's editable based on status
  // Draft: Everything editable
  // Submitted+: Line items locked, header partially editable
  // Posted/Voided: Nothing editable (should redirect to view page)
  const isLineItemsLocked = currentStatus && currentStatus !== 'draft';
  const isFullyLocked = currentStatus === 'posted' || currentStatus === 'voided';
  const canSubmit = !currentStatus || currentStatus === 'draft';
  const canRecall = currentStatus === 'submitted';

  // Filter categories based on transaction type
  const filteredCategoryOptions = React.useMemo(() => {
    // No category needed for these types
    if (["transfer", "fund_rollover", "opening_balance", "reclass"].includes(transactionType)) {
      return [];
    }

    // Refund uses income categories (reversing income)
    if (transactionType === "refund") {
      return categoryOptions.filter((cat) => cat.type === "income_transaction" || !cat.type);
    }

    // Adjustment can use any transaction category
    if (transactionType === "adjustment") {
      return categoryOptions.filter((cat) =>
        cat.type === "income_transaction" || cat.type === "expense_transaction" || !cat.type
      );
    }

    // Income/expense filter by type
    const expectedType = transactionType === "income" ? "income_transaction" : "expense_transaction";
    return categoryOptions.filter((cat) => {
      if (!cat.type) return true;
      return cat.type === expectedType;
    });
  }, [categoryOptions, transactionType]);

  // Calculate total
  const total = React.useMemo(() => {
    return lines.reduce((sum, line) => sum + (line.amount || 0), 0);
  }, [lines]);

  // Line management
  const handleAddLine = () => {
    const newLine = createEmptyLine(lines.length + 1);
    setLines((prev) => [...prev, newLine]);
  };

  const handleUpdateLine = (lineId: string, field: keyof TransactionLine, value: unknown) => {
    setLines((prev) =>
      prev.map((line) =>
        line.id === lineId ? { ...line, [field]: value, isDirty: true } : line
      )
    );
  };

  const handleDeleteLine = (lineId: string) => {
    if (lines.length <= 1) {
      toast.error("At least one line item is required");
      return;
    }
    setLines((prev) => prev.filter((l) => l.id !== lineId));
  };

  // ==========================================================================
  // Excel Import Configuration (using reusable hook)
  // ==========================================================================

  // Define the import data type
  type ImportLineData = {
    categoryId: string;
    fundId: string;
    sourceId: string;
    accountId: string;
    amount: number;
    description: string;
  };

  // Configure the Excel import hook
  const excelImportConfig: ExcelImportConfig<ImportLineData> = React.useMemo(() => ({
    columns: [
      {
        field: "categoryId",
        header: "Category Code",
        aliases: ["Category", "CategoryCode", "category_code"],
        required: true,
        width: 15,
        lookup: {
          options: filteredCategoryOptions.map(opt => ({
            value: opt.value,
            label: opt.label,
            code: opt.code,
          })),
        },
      },
      {
        field: "categoryId",
        header: "Category Name",
        referenceOnly: true,
        width: 30,
      },
      {
        field: "fundId",
        header: "Fund Code",
        aliases: ["Fund", "FundCode", "fund_code"],
        required: true,
        width: 12,
        lookup: {
          options: fundOptions.map(opt => ({
            value: opt.value,
            label: opt.label,
            code: opt.code,
          })),
        },
      },
      {
        field: "fundId",
        header: "Fund Name",
        referenceOnly: true,
        width: 25,
      },
      {
        field: "sourceId",
        header: "Source Code",
        aliases: ["Source", "SourceCode", "source_code"],
        required: true,
        width: 12,
        lookup: {
          options: sourceOptions.map(opt => ({
            value: opt.value,
            label: opt.label,
            code: opt.code,
          })),
        },
      },
      {
        field: "sourceId",
        header: "Source Name",
        referenceOnly: true,
        width: 25,
      },
      {
        field: "accountId",
        header: "Account Code",
        aliases: ["Account", "AccountCode", "account_code"],
        required: false,
        width: 15,
        lookup: {
          options: accountOptions.map(opt => ({
            value: opt.value,
            label: opt.label,
            code: opt.code,
          })),
        },
      },
      {
        field: "accountId",
        header: "Account Name",
        referenceOnly: true,
        width: 30,
      },
      {
        field: "amount",
        header: "Amount",
        aliases: ["amount"],
        required: true,
        type: "number",
        width: 12,
      },
      {
        field: "description",
        header: "Description",
        aliases: ["Memo", "memo", "description"],
        required: false,
        type: "string",
        width: 40,
      },
    ],
    templateFileName: `transaction_import_template_${transactionType}`,
    instructions: [
      "How to use this template:",
      "",
      "1. Fill in the 'Data' sheet with your transaction line items",
      "2. Use the Category Code, Fund Code, and Source Code columns",
      "3. The 'Name' columns are for reference only and will be ignored during import",
      "4. Amount must be a positive number",
      "5. Description is optional but recommended",
    ],
    sampleData: [
      {
        "Category Code": filteredCategoryOptions[0]?.code || "TITHE-001",
        "Category Name": `${filteredCategoryOptions[0]?.label || "Tithes"} (for reference only)`,
        "Fund Code": fundOptions[0]?.code || "GEN",
        "Fund Name": `${fundOptions[0]?.label || "General Fund"} (for reference only)`,
        "Source Code": sourceOptions[0]?.code || "BANK",
        "Source Name": `${sourceOptions[0]?.label || "Bank Account"} (for reference only)`,
        "Account Code": accountOptions[0]?.code || "",
        "Account Name": `${accountOptions[0]?.label || ""} (for reference only)`,
        "Amount": 1000.00,
        "Description": "Sample transaction line",
      },
    ],
    generateId: generateLineId,
  }), [filteredCategoryOptions, fundOptions, sourceOptions, accountOptions, transactionType]);

  const excelImport = useExcelImport(excelImportConfig);

  // Preview columns for the import dialog
  const importPreviewColumns: ExcelImportDialogColumn<ImportLineData>[] = React.useMemo(() => [
    {
      field: "categoryId",
      header: "Category",
      highlightEmpty: true,
      render: (value) => {
        const opt = filteredCategoryOptions.find(o => o.value === value);
        return opt?.label || "—";
      },
    },
    {
      field: "fundId",
      header: "Fund",
      highlightEmpty: true,
      render: (value) => {
        const opt = fundOptions.find(o => o.value === value);
        return opt?.label || "—";
      },
    },
    {
      field: "sourceId",
      header: "Source",
      highlightEmpty: true,
      render: (value) => {
        const opt = sourceOptions.find(o => o.value === value);
        return opt?.label || "—";
      },
    },
    {
      field: "amount",
      header: "Amount",
      align: "right",
      highlightEmpty: true,
    },
    {
      field: "description",
      header: "Description",
      render: (value) => (value as string) || "—",
    },
  ], [filteredCategoryOptions, fundOptions, sourceOptions]);

  // Handle import confirmation
  const handleImportConfirm = (importedRows: ImportLineData[]) => {
    // Convert imported data to TransactionLine format
    const newLines: TransactionLine[] = importedRows.map((row, index) => ({
      id: generateLineId(),
      lineNumber: lines.length + index + 1,
      accountId: row.accountId || "",
      categoryId: row.categoryId,
      fundId: row.fundId,
      sourceId: row.sourceId,
      budgetId: "",
      amount: row.amount,
      description: row.description || "",
      isNew: true,
      isDirty: false,
    }));

    // Add imported lines to existing lines (or replace if only empty line exists)
    if (lines.length === 1 && !lines[0].categoryId && lines[0].amount === 0) {
      setLines(newLines);
    } else {
      setLines((prev) => [...prev, ...newLines]);
    }

    toast.success(`${importedRows.length} line(s) imported successfully`);
    setIsImportDialogOpen(false);
  };

  // Form submission
  const handleSubmit = async (asDraft: boolean = false) => {
    // Common validation
    if (!transactionDate) {
      toast.error("Transaction date is required");
      return;
    }
    if (!description.trim()) {
      toast.error("Description is required");
      return;
    }
    if (lines.length === 0) {
      toast.error("At least one line item is required");
      return;
    }

    const requiredFields = getRequiredFieldsForType(transactionType);

    // Type-specific validation
    if (transactionType === "transfer") {
      if (!destinationSourceId) {
        toast.error("Destination source is required for transfers");
        return;
      }
      const hasInvalidLine = lines.some((line) => !line.sourceId || line.amount <= 0 || line.sourceId === destinationSourceId);
      if (hasInvalidLine) {
        toast.error("Each line must have a source different from destination and amount greater than zero");
        return;
      }
    } else if (transactionType === "fund_rollover") {
      if (!destinationFundId) {
        toast.error("Destination fund is required for fund rollovers");
        return;
      }
      const hasInvalidLine = lines.some((line) => !line.fundId || line.amount <= 0 || line.fundId === destinationFundId);
      if (hasInvalidLine) {
        toast.error("Each line must have a fund different from destination and amount greater than zero");
        return;
      }
    } else if (transactionType === "reversal") {
      if (!referenceTransactionId) {
        toast.error("Original transaction must be selected for reversals");
        return;
      }
    } else if (transactionType === "reclass") {
      const hasInvalidLine = lines.some((line) => !line.fromCoaId || !line.toCoaId || line.amount <= 0 || line.fromCoaId === line.toCoaId);
      if (hasInvalidLine) {
        toast.error("Each line must have different from/to accounts and amount greater than zero");
        return;
      }
    } else {
      // Default validation for income, expense, adjustment, refund, opening_balance, etc.
      const hasInvalidLine = lines.some((line) => {
        if (line.amount <= 0) return true;
        if (requiredFields.category && !line.categoryId) return true;
        if (requiredFields.fund && !line.fundId) return true;
        if (requiredFields.source && !line.sourceId) return true;
        return false;
      });
      if (hasInvalidLine) {
        const requiredList = [];
        if (requiredFields.category) requiredList.push("category");
        if (requiredFields.fund) requiredList.push("fund");
        if (requiredFields.source) requiredList.push("source");
        toast.error(`Each line must have ${requiredList.join(", ")} and amount greater than zero`);
        return;
      }
    }

    // Start submission with progress feedback
    setIsSubmitting(true);
    setSubmitProgress(0);
    setSubmitStatus("Validating transaction data...");

    try {
      // Simulate progress steps for better UX
      setSubmitProgress(20);
      setSubmitStatus("Preparing transaction...");

      const payload = {
        transactionId: transactionId || undefined, // Include for updates
        transactionType,
        transactionDate: format(transactionDate, "yyyy-MM-dd"),
        reference: reference.trim() || null,
        description: description.trim(),
        status: asDraft ? "draft" : "submitted",
        // Extended transaction type fields
        destinationSourceId: destinationSourceId || null,
        destinationFundId: destinationFundId || null,
        referenceTransactionId: referenceTransactionId || null,
        adjustmentReason: adjustmentReason.trim() || null,
        lines: lines.map((line) => ({
          id: line.isNew ? undefined : line.id, // Only include id for existing lines
          accountId: line.accountId || null,
          categoryId: line.categoryId || null,
          fundId: line.fundId || null,
          sourceId: line.sourceId || null,
          budgetId: line.budgetId || null,
          amount: line.amount,
          description: line.description || null,
          isDirty: line.isDirty || false,
          isNew: line.isNew || false,
          // Extended line fields
          destinationSourceId: line.destinationSourceId || null,
          destinationFundId: line.destinationFundId || null,
          fromCoaId: line.fromCoaId || null,
          toCoaId: line.toCoaId || null,
        })),
        totalAmount: total,
      };

      setSubmitProgress(40);
      setSubmitStatus(asDraft ? "Saving draft..." : "Submitting transaction...");

      const response = await fetch("/api/metadata/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: {
            id: asDraft ? "admin-finance.transactions.saveDraft" : "admin-finance.transactions.submit",
          },
          input: payload,
        }),
      });

      setSubmitProgress(80);
      setSubmitStatus("Processing response...");

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to save transaction");
      }

      setSubmitProgress(100);
      setSubmitStatus(asDraft ? "Draft saved!" : "Transaction submitted!");

      // Brief delay to show completion before navigating
      await new Promise((resolve) => setTimeout(resolve, 500));

      toast.success(asDraft ? "Draft saved successfully" : "Transaction submitted successfully");
      router.push(cancelUrl);
    } catch (error) {
      console.error("Transaction submission error:", error);
      setSubmitStatus("");
      setSubmitProgress(0);
      toast.error(error instanceof Error ? error.message : "Failed to save transaction");
      setIsSubmitting(false);
    }
  };

  // Recall a submitted transaction back to draft
  const handleRecall = async () => {
    if (!transactionId) return;

    setIsSubmitting(true);
    setSubmitProgress(0);
    setSubmitStatus("Recalling transaction...");

    try {
      setSubmitProgress(30);

      const response = await fetch("/api/metadata/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: { id: "admin-finance.transactions.recall" },
          input: { transactionId },
        }),
      });

      setSubmitProgress(70);
      setSubmitStatus("Processing...");

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to recall transaction");
      }

      setSubmitProgress(100);
      setSubmitStatus("Transaction recalled!");

      await new Promise((resolve) => setTimeout(resolve, 500));

      toast.success("Transaction recalled to draft status");
      // Refresh the page to show updated status
      router.refresh();
    } catch (error) {
      console.error("Transaction recall error:", error);
      setSubmitStatus("");
      setSubmitProgress(0);
      toast.error(error instanceof Error ? error.message : "Failed to recall transaction");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Page Header - Dynamic based on transaction type and editing state */}
      <header className="space-y-1.5 sm:space-y-2">
        <p className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-primary/80">{eyebrow}</p>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <span className="h-6 w-1 rounded-full bg-primary shrink-0" />
          {isEditing
            ? `Edit ${getTransactionTypeConfig(transactionType).label.toLowerCase()} transaction`
            : `Record ${getTransactionTypeConfig(transactionType).label.toLowerCase()}`}
        </h1>
        <p className="text-sm text-muted-foreground pl-3">
          {isEditing
            ? "Update the transaction details below."
            : getTransactionTypeDescription(transactionType)}
        </p>
      </header>

      {/* Status Banner - Shows when transaction is not in draft status */}
      {currentStatus && currentStatus !== 'draft' && (
        <div className={cn(
          "group relative overflow-hidden",
          "flex items-center gap-3 rounded-xl sm:rounded-2xl border p-4 sm:p-5",
          "backdrop-blur-sm transition-all duration-200",
          currentStatus === 'submitted' && "border-amber-300/60 bg-amber-50/80 text-amber-800",
          currentStatus === 'approved' && "border-blue-300/60 bg-blue-50/80 text-blue-800",
          currentStatus === 'posted' && "border-emerald-300/60 bg-emerald-50/80 text-emerald-800",
          currentStatus === 'voided' && "border-red-300/60 bg-red-50/80 text-red-800"
        )}>
          {/* Top accent line based on status */}
          <div className={cn(
            "absolute top-0 left-0 right-0 h-0.5",
            currentStatus === 'submitted' && "bg-amber-400",
            currentStatus === 'approved' && "bg-blue-400",
            currentStatus === 'posted' && "bg-emerald-400",
            currentStatus === 'voided' && "bg-red-400"
          )} />

          <div className={cn(
            "flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl",
            currentStatus === 'submitted' && "bg-amber-100",
            currentStatus === 'approved' && "bg-blue-100",
            currentStatus === 'posted' && "bg-emerald-100",
            currentStatus === 'voided' && "bg-red-100"
          )}>
            {currentStatus === 'submitted' && <Clock className="size-5 sm:size-6" />}
            {currentStatus === 'approved' && <CheckCircle2 className="size-5 sm:size-6" />}
            {currentStatus === 'posted' && <Lock className="size-5 sm:size-6" />}
            {currentStatus === 'voided' && <Ban className="size-5 sm:size-6" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm sm:text-base">
              {currentStatus === 'submitted' && "Pending Approval"}
              {currentStatus === 'approved' && "Approved - Ready to Post"}
              {currentStatus === 'posted' && "Posted to Ledger"}
              {currentStatus === 'voided' && "Transaction Voided"}
            </p>
            <p className="text-xs sm:text-sm opacity-80">
              {currentStatus === 'submitted' && "This transaction is awaiting approval. Line items cannot be modified."}
              {currentStatus === 'approved' && "This transaction has been approved and is ready to be posted. Line items cannot be modified."}
              {currentStatus === 'posted' && "This transaction has been posted to the ledger and cannot be modified."}
              {currentStatus === 'voided' && "This transaction has been voided and cannot be modified."}
            </p>
          </div>
        </div>
      )}

      {/* Main Form Container */}
      <div className={cn(
        "group relative overflow-hidden",
        "rounded-2xl sm:rounded-3xl border border-border/40 p-4 sm:p-6",
        "bg-card/50 backdrop-blur-sm shadow-sm",
        "transition-all duration-200",
        isSubmitting && "pointer-events-none opacity-60"
      )}>
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/20" />
        {/* Transaction Type Selector - Disabled when editing */}
        <div className="mb-5 sm:mb-6">
          <Label className="mb-3 block text-sm font-semibold text-foreground flex items-center gap-2">
            <span className="h-3 w-0.5 rounded-full bg-primary/60" />
            Transaction Type
            {isEditing && (
              <span className="text-xs font-normal text-muted-foreground">(cannot be changed)</span>
            )}
          </Label>
          <div className="space-y-4">
            {TRANSACTION_TYPE_GROUPS.map((group, groupIndex) => (
              <div
                key={group.label}
                className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
                style={{ animationDelay: `${groupIndex * 50}ms` }}
              >
                <p className="mb-2 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {group.label}
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.types.map((typeConfig) => {
                    const Icon = typeConfig.icon;
                    const isSelected = transactionType === typeConfig.value;
                    const colorClasses = getColorClasses(typeConfig.color, isSelected);

                    return (
                      <button
                        key={typeConfig.value}
                        type="button"
                        onClick={() => !isEditing && setTransactionType(typeConfig.value)}
                        disabled={isEditing}
                        className={cn(
                          "flex items-center gap-2 rounded-lg sm:rounded-xl border-2 px-2.5 sm:px-3 py-1.5 sm:py-2",
                          "text-xs sm:text-sm font-medium transition-all duration-200",
                          isSelected
                            ? cn(colorClasses.selected, "shadow-sm")
                            : "border-border/60 bg-background/50 text-muted-foreground",
                          !isEditing && !isSelected && colorClasses.hover,
                          isEditing && "cursor-not-allowed opacity-60"
                        )}
                      >
                        <Icon className={cn(
                          "size-3.5 sm:size-4",
                          isSelected ? colorClasses.icon : "text-muted-foreground"
                        )} />
                        <span>{typeConfig.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Extended Transaction Type Fields */}
        {/* Transfer: Destination Source */}
        {transactionType === "transfer" && (
          <div className={cn(
            "mb-5 sm:mb-6 rounded-xl sm:rounded-2xl border p-4",
            "border-blue-200/60 bg-blue-50/30 backdrop-blur-sm",
            "animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
          )}>
            <Label className="mb-2 block text-sm font-semibold text-foreground flex items-center gap-2">
              <ArrowLeftRight className="size-4 text-blue-600" />
              Transfer To <span className="text-destructive">*</span>
            </Label>
            <p className="mb-3 text-xs text-muted-foreground">
              Select the destination account for this transfer.
            </p>
            <InlineCombobox
              options={sourceOptions}
              value={destinationSourceId}
              onChange={setDestinationSourceId}
              placeholder="Select destination source"
              emptyMessage="No sources available"
              disabled={isFullyLocked}
            />
          </div>
        )}

        {/* Fund Rollover: Destination Fund */}
        {transactionType === "fund_rollover" && (
          <div className={cn(
            "mb-5 sm:mb-6 rounded-xl sm:rounded-2xl border p-4",
            "border-violet-200/60 bg-violet-50/30 backdrop-blur-sm",
            "animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
          )}>
            <Label className="mb-2 block text-sm font-semibold text-foreground flex items-center gap-2">
              <RefreshCw className="size-4 text-violet-600" />
              Rollover To Fund <span className="text-destructive">*</span>
            </Label>
            <p className="mb-3 text-xs text-muted-foreground">
              Select the destination fund for this rollover.
            </p>
            <InlineCombobox
              options={fundOptions}
              value={destinationFundId}
              onChange={setDestinationFundId}
              placeholder="Select destination fund"
              emptyMessage="No funds available"
              disabled={isFullyLocked}
            />
          </div>
        )}

        {/* Reversal: Original Transaction Reference */}
        {transactionType === "reversal" && (
          <div className={cn(
            "mb-5 sm:mb-6 rounded-xl sm:rounded-2xl border p-4",
            "border-red-200/60 bg-red-50/30 backdrop-blur-sm",
            "animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
          )}>
            <Label className="mb-2 block text-sm font-semibold text-foreground flex items-center gap-2">
              <RotateCcw className="size-4 text-red-600" />
              Original Transaction <span className="text-destructive">*</span>
            </Label>
            <p className="mb-3 text-xs text-muted-foreground">
              Select the posted transaction to reverse.
            </p>
            <InlineCombobox
              options={postedTransactions}
              value={referenceTransactionId}
              onChange={setReferenceTransactionId}
              placeholder="Select transaction to reverse"
              emptyMessage="No posted transactions available"
              disabled={isFullyLocked}
            />
          </div>
        )}

        {/* Adjustment: Reason */}
        {transactionType === "adjustment" && (
          <div className={cn(
            "mb-5 sm:mb-6 rounded-xl sm:rounded-2xl border p-4",
            "border-amber-200/60 bg-amber-50/30 backdrop-blur-sm",
            "animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
          )}>
            <Label className="mb-2 block text-sm font-semibold text-foreground flex items-center gap-2">
              <Sliders className="size-4 text-amber-600" />
              Adjustment Reason <span className="text-destructive">*</span>
            </Label>
            <p className="mb-3 text-xs text-muted-foreground">
              Provide a reason for this adjustment.
            </p>
            <Textarea
              value={adjustmentReason}
              onChange={(e) => setAdjustmentReason(e.target.value)}
              placeholder="Explain the reason for this adjustment..."
              rows={2}
              className="resize-none border-border/60 bg-background/50"
              disabled={isFullyLocked}
            />
          </div>
        )}

        {/* Allocation: Destination Fund */}
        {transactionType === "allocation" && (
          <div className={cn(
            "mb-5 sm:mb-6 rounded-xl sm:rounded-2xl border p-4",
            "border-indigo-200/60 bg-indigo-50/30 backdrop-blur-sm",
            "animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
          )}>
            <Label className="mb-2 block text-sm font-semibold text-foreground flex items-center gap-2">
              <Share2 className="size-4 text-indigo-600" />
              Allocate To Fund <span className="text-destructive">*</span>
            </Label>
            <p className="mb-3 text-xs text-muted-foreground">
              Select the destination fund for this cost allocation.
            </p>
            <InlineCombobox
              options={fundOptions}
              value={destinationFundId}
              onChange={setDestinationFundId}
              placeholder="Select destination fund"
              emptyMessage="No funds available"
              disabled={isFullyLocked}
            />
          </div>
        )}

        {/* Transaction Header Fields */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="transactionDate" className="text-sm font-semibold">
              Transaction Date <span className="text-destructive">*</span>
            </Label>
            <Popover open={!isFullyLocked && datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="transactionDate"
                  variant="outline"
                  disabled={isFullyLocked}
                  className={cn(
                    "h-11 w-full justify-start text-left font-normal",
                    !transactionDate && "text-muted-foreground",
                    isFullyLocked && "cursor-not-allowed opacity-60"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {transactionDate ? format(transactionDate, "MMMM d, yyyy") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={transactionDate}
                  onSelect={(date) => {
                    if (date) {
                      setTransactionDate(date);
                      setDatePickerOpen(false);
                    }
                  }}
                  autoFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reference" className="text-sm font-semibold">
              Reference
            </Label>
            <Input
              id="reference"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Check #, invoice #, receipt #"
              className="h-11"
              disabled={isFullyLocked}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description" className="text-sm font-semibold">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this transaction..."
              rows={2}
              className="resize-none"
              disabled={isFullyLocked}
            />
          </div>
        </div>

        {/* Line Items Section */}
        <div className="mb-5 sm:mb-6">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="h-3 w-0.5 rounded-full bg-primary/60" />
              Line Items
              {isLineItemsLocked && (
                <span className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
                  <Lock className="size-3" /> Locked
                </span>
              )}
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              {!isLineItemsLocked && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={excelImport.downloadTemplate}
                    className="h-8 gap-1.5 text-xs border-border/60 hover:border-primary/40 transition-colors"
                  >
                    <Download className="size-3.5" />
                    <span className="hidden sm:inline">Template</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsImportDialogOpen(true)}
                    className="h-8 gap-1.5 text-xs border-border/60 hover:border-primary/40 transition-colors"
                  >
                    <Upload className="size-3.5" />
                    <span className="hidden sm:inline">Import Excel</span>
                  </Button>
                </>
              )}
              <span className="text-xs sm:text-sm text-muted-foreground bg-muted/30 px-2 py-1 rounded-md">
                {lines.length} {lines.length === 1 ? "item" : "items"}
              </span>
            </div>
          </div>

          {/* Line Items Table */}
          <div className={cn(
            "overflow-hidden rounded-xl sm:rounded-2xl border border-border/40",
            "bg-background/50 backdrop-blur-sm"
          )}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/20">
                    <th className="w-10 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      #
                    </th>
                    <th className="min-w-[160px] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Account
                    </th>
                    {/* Category - hide for transfer, fund_rollover, opening_balance, reclass */}
                    {!["transfer", "fund_rollover", "opening_balance", "reclass"].includes(transactionType) && (
                      <th className="min-w-[180px] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Category <span className="text-destructive">*</span>
                      </th>
                    )}
                    {/* Fund - hide for transfer */}
                    {transactionType !== "transfer" && (
                      <th className="min-w-[140px] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Fund <span className="text-destructive">*</span>
                      </th>
                    )}
                    {/* Source - hide for fund_rollover, reclass, closing_entry */}
                    {!["fund_rollover", "reclass", "closing_entry"].includes(transactionType) && (
                      <th className="min-w-[140px] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Source <span className="text-destructive">*</span>
                      </th>
                    )}
                    {/* From/To COA - for reclass only */}
                    {transactionType === "reclass" && (
                      <>
                        <th className="min-w-[160px] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          From Account <span className="text-destructive">*</span>
                        </th>
                        <th className="min-w-[160px] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          To Account <span className="text-destructive">*</span>
                        </th>
                      </>
                    )}
                    {/* Budget - expense only */}
                    {transactionType === "expense" && (
                      <th className="min-w-[160px] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Budget
                      </th>
                    )}
                    <th className="min-w-[100px] w-36 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Amount <span className="text-destructive">*</span>
                    </th>
                    <th className="min-w-[250px] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Memo
                    </th>
                    <th className="w-10 px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => (
                    <tr
                      key={line.id}
                      className={cn(
                        "border-b border-border/40 transition-colors hover:bg-muted/20",
                        line.isDirty && "bg-amber-500/5",
                        line.isNew && "bg-primary/5"
                      )}
                    >
                      <td className="px-3 py-2 text-center text-sm font-medium text-muted-foreground">
                        {index + 1}
                      </td>
                      <td className="px-1 py-1">
                        <InlineCombobox
                          options={accountOptions}
                          value={line.accountId}
                          onChange={(value) => !isLineItemsLocked && handleUpdateLine(line.id, "accountId", value)}
                          placeholder="Select account"
                          emptyMessage="No accounts available"
                          allowClear
                          disabled={isLineItemsLocked}
                        />
                      </td>
                      {/* Category - hide for transfer, fund_rollover, opening_balance, reclass */}
                      {!["transfer", "fund_rollover", "opening_balance", "reclass"].includes(transactionType) && (
                        <td className="px-1 py-1">
                          <InlineCombobox
                            options={filteredCategoryOptions}
                            value={line.categoryId}
                            onChange={(value) => !isLineItemsLocked && handleUpdateLine(line.id, "categoryId", value)}
                            placeholder="Select category"
                            emptyMessage="No categories available"
                            disabled={isLineItemsLocked}
                          />
                        </td>
                      )}
                      {/* Fund - hide for transfer */}
                      {transactionType !== "transfer" && (
                        <td className="px-1 py-1">
                          <InlineCombobox
                            options={fundOptions}
                            value={line.fundId}
                            onChange={(value) => !isLineItemsLocked && handleUpdateLine(line.id, "fundId", value)}
                            placeholder="Select fund"
                            emptyMessage="No funds available"
                            disabled={isLineItemsLocked}
                          />
                        </td>
                      )}
                      {/* Source - hide for fund_rollover, reclass, closing_entry */}
                      {!["fund_rollover", "reclass", "closing_entry"].includes(transactionType) && (
                        <td className="px-1 py-1">
                          <InlineCombobox
                            options={sourceOptions}
                            value={line.sourceId}
                            onChange={(value) => !isLineItemsLocked && handleUpdateLine(line.id, "sourceId", value)}
                            placeholder="Select source"
                            emptyMessage="No sources available"
                            disabled={isLineItemsLocked}
                          />
                        </td>
                      )}
                      {/* From/To COA - for reclass only */}
                      {transactionType === "reclass" && (
                        <>
                          <td className="px-1 py-1">
                            <InlineCombobox
                              options={coaOptions}
                              value={line.fromCoaId || ""}
                              onChange={(value) => !isLineItemsLocked && handleUpdateLine(line.id, "fromCoaId", value)}
                              placeholder="Select from account"
                              emptyMessage="No accounts available"
                              disabled={isLineItemsLocked}
                            />
                          </td>
                          <td className="px-1 py-1">
                            <InlineCombobox
                              options={coaOptions}
                              value={line.toCoaId || ""}
                              onChange={(value) => !isLineItemsLocked && handleUpdateLine(line.id, "toCoaId", value)}
                              placeholder="Select to account"
                              emptyMessage="No accounts available"
                              disabled={isLineItemsLocked}
                            />
                          </td>
                        </>
                      )}
                      {/* Budget - expense only */}
                      {transactionType === "expense" && (
                        <td className="px-1 py-1">
                          <InlineCombobox
                            options={budgetOptions}
                            value={line.budgetId}
                            onChange={(value) => !isLineItemsLocked && handleUpdateLine(line.id, "budgetId", value)}
                            placeholder="Select budget"
                            emptyMessage="No budgets available"
                            allowClear
                            disabled={isLineItemsLocked}
                          />
                        </td>
                      )}
                      <td className="px-2 py-2">
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={line.amount === 0 ? "" : line.amount.toString()}
                          onChange={(e) => handleUpdateLine(line.id, "amount", parseCurrencyInput(e.target.value))}
                          placeholder="0.00"
                          className="h-9 border-transparent bg-transparent text-right font-medium tabular-nums hover:border-border focus:border-border"
                          disabled={isLineItemsLocked}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="text"
                          value={line.description}
                          onChange={(e) => handleUpdateLine(line.id, "description", e.target.value)}
                          placeholder="Line memo"
                          className="h-9 border-transparent bg-transparent hover:border-border focus:border-border"
                          disabled={isLineItemsLocked}
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        {!isLineItemsLocked && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteLine(line.id)}
                            disabled={lines.length <= 1}
                            className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                          >
                            <Trash2 className="size-4" />
                            <span className="sr-only">Delete line</span>
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border/60 bg-muted/20">
                    <td colSpan={getTableColSpan(transactionType)} className="px-3 py-3">
                      {!isLineItemsLocked && (
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
                    <td className="px-3 py-3 text-right">
                      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Total
                      </div>
                      <div className={cn(
                        "text-lg font-bold tabular-nums",
                        getTotalColorClass(transactionType)
                      )}>
                        {formatCurrency(total, currency)}
                      </div>
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Action Buttons - Changes based on transaction status */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between border-t border-border/40 pt-5 sm:pt-6">
          {/* Left side - Back/Cancel button */}
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push(cancelUrl)}
            disabled={isSubmitting}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            <ArrowLeft className="mr-2 size-4" />
            {isEditing && currentStatus && currentStatus !== 'draft' ? 'Back' : 'Cancel'}
          </Button>

          {/* Right side - Action buttons based on status */}
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3 order-1 sm:order-2">
            {/* Draft or New: Show Save Draft + Submit */}
            {canSubmit && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSubmit(true)}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto border-border/60 hover:border-primary/40"
                >
                  <Save className="mr-2 size-4" />
                  Save as Draft
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSubmit(false)}
                  disabled={isSubmitting}
                  className={cn(
                    "w-full sm:w-auto",
                    "transition-all hover:shadow-lg active:scale-[0.98]",
                    getSubmitButtonClass(transactionType)
                  )}
                >
                  <Send className="mr-2 size-4" />
                  {isSubmitting ? "Submitting..." : "Submit for Approval"}
                </Button>
              </>
            )}

            {/* Submitted: Show Recall button */}
            {canRecall && (
              <Button
                type="button"
                variant="outline"
                onClick={handleRecall}
                disabled={isSubmitting}
                className="w-full sm:w-auto border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
              >
                <RotateCcw className="mr-2 size-4" />
                {isSubmitting ? "Recalling..." : "Recall to Draft"}
              </Button>
            )}

            {/* Approved: Show status message (no edits allowed, only authorized users can post) */}
            {currentStatus === 'approved' && (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-blue-50/80 px-4 py-2.5 text-sm font-medium text-blue-700">
                <CheckCircle2 className="size-4" />
                Awaiting posting by authorized user
              </div>
            )}

            {/* Posted: Show posted confirmation */}
            {currentStatus === 'posted' && (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50/80 px-4 py-2.5 text-sm font-medium text-emerald-700">
                <Lock className="size-4" />
                Posted to ledger
              </div>
            )}

            {/* Voided: Show voided status */}
            {currentStatus === 'voided' && (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-red-50/80 px-4 py-2.5 text-sm font-medium text-red-700">
                <Ban className="size-4" />
                Transaction voided
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Submission Progress Dialog */}
      <Dialog open={isSubmitting} onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-md border-border/40 bg-background/95 backdrop-blur-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">
            {submitProgress === 100 ? "Transaction Complete" : "Processing Transaction"}
          </DialogTitle>
          <div className="flex flex-col items-center gap-6 py-6">
            {/* Spinner or Checkmark */}
            <div className={cn(
              "flex size-16 sm:size-20 items-center justify-center rounded-2xl transition-all duration-300",
              submitProgress === 100
                ? "bg-emerald-100 text-emerald-600 shadow-lg shadow-emerald-500/20"
                : "bg-primary/10 text-primary"
            )}>
              {submitProgress === 100 ? (
                <CheckCircle2 className="size-8 sm:size-10 animate-in zoom-in-50 duration-300" />
              ) : (
                <Loader2 className="size-8 sm:size-10 animate-spin" />
              )}
            </div>

            {/* Status Text */}
            <div className="text-center space-y-1.5">
              <h3 className="text-lg sm:text-xl font-bold text-foreground">
                {submitProgress === 100 ? "Complete!" : "Processing..."}
              </h3>
              <p className="text-sm text-muted-foreground">
                {submitStatus}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full space-y-2 px-4">
              <Progress value={submitProgress} className="h-2.5 bg-muted/50" />
              <p className="text-center text-xs font-medium text-muted-foreground tabular-nums">
                {submitProgress}%
              </p>
            </div>

            {/* Info Text */}
            {submitProgress < 100 && (
              <p className="text-center text-xs text-muted-foreground/80">
                Please wait while we process your transaction...
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Excel Import Dialog - Using Reusable Component */}
      <ExcelImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        title="Import Transaction Lines"
        description="Upload an Excel file to import transaction line items. Download the template for the correct format."
        previewColumns={importPreviewColumns}
        importState={excelImport}
        onImport={handleImportConfirm}
        currency={currency}
      />
    </div>
  );
}

export default AdminTransactionEntry;
