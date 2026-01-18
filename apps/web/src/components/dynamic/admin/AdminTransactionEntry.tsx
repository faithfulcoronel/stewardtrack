"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save, X, ArrowUpCircle, ArrowDownCircle, Check, ChevronsUpDown, CalendarIcon, Clock, CheckCircle2, Ban, Lock, RotateCcw, ArrowLeft, Send, Loader2, Upload, Download } from "lucide-react";
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
}

export interface TransactionInitialData {
  transactionId?: string;
  transactionType?: "income" | "expense";
  transactionDate?: string;
  reference?: string;
  description?: string;
  status?: string;
  lines?: {
    id?: string;
    accountId?: string;
    categoryId?: string;
    fundId?: string;
    sourceId?: string;
    budgetId?: string;
    amount?: number;
    description?: string;
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
  // Settings
  currency?: string;
  defaultTransactionType?: "income" | "expense";
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
  const [transactionType, setTransactionType] = React.useState<"income" | "expense">(
    initialData?.transactionType || defaultTransactionType
  );
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
  // Database has: income_transaction, expense_transaction
  // UI has: income, expense
  const filteredCategoryOptions = React.useMemo(() => {
    const expectedType = transactionType === "income" ? "income_transaction" : "expense_transaction";
    return categoryOptions.filter((cat) => {
      // If no type, show all; otherwise match the expected type
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
    // Validation
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

    const hasInvalidLine = lines.some((line) => !line.categoryId || !line.fundId || !line.sourceId || line.amount <= 0);
    if (hasInvalidLine) {
      toast.error("Each line must have a category, fund, source, and amount greater than zero");
      return;
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
        lines: lines.map((line) => ({
          id: line.isNew ? undefined : line.id, // Only include id for existing lines
          accountId: line.accountId || null,
          categoryId: line.categoryId,
          fundId: line.fundId || null,
          sourceId: line.sourceId || null,
          budgetId: line.budgetId || null,
          amount: line.amount,
          description: line.description || null,
          isDirty: line.isDirty || false,
          isNew: line.isNew || false,
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
    <div className="space-y-6">
      {/* Page Header - Dynamic based on transaction type and editing state */}
      <header className="space-y-1">
        <p className="text-sm font-medium text-primary">{eyebrow}</p>
        <h1 className="text-2xl font-bold text-foreground">
          {isEditing
            ? `Edit ${transactionType === "income" ? "income" : "expense"} transaction`
            : transactionType === "income" ? "Record income" : "Record expense"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isEditing
            ? "Update the transaction details below."
            : transactionType === "income"
              ? "Enter details for incoming funds and donations."
              : "Enter details for outgoing payments and expenses."}
        </p>
      </header>

      {/* Status Banner - Shows when transaction is not in draft status */}
      {currentStatus && currentStatus !== 'draft' && (
        <div className={cn(
          "flex items-center gap-3 rounded-xl border p-4",
          currentStatus === 'submitted' && "border-amber-200 bg-amber-50 text-amber-800",
          currentStatus === 'approved' && "border-blue-200 bg-blue-50 text-blue-800",
          currentStatus === 'posted' && "border-emerald-200 bg-emerald-50 text-emerald-800",
          currentStatus === 'voided' && "border-red-200 bg-red-50 text-red-800"
        )}>
          {currentStatus === 'submitted' && <Clock className="size-5" />}
          {currentStatus === 'approved' && <CheckCircle2 className="size-5" />}
          {currentStatus === 'posted' && <Lock className="size-5" />}
          {currentStatus === 'voided' && <Ban className="size-5" />}
          <div className="flex-1">
            <p className="font-medium">
              {currentStatus === 'submitted' && "Pending Approval"}
              {currentStatus === 'approved' && "Approved - Ready to Post"}
              {currentStatus === 'posted' && "Posted to Ledger"}
              {currentStatus === 'voided' && "Transaction Voided"}
            </p>
            <p className="text-sm opacity-80">
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
        "rounded-3xl border border-border/60 bg-background p-6 shadow-sm transition-opacity",
        isSubmitting && "pointer-events-none opacity-60"
      )}>
        {/* Transaction Type Toggle - Disabled when editing */}
        <div className="mb-6">
          <Label className="mb-3 block text-sm font-semibold text-foreground">
            Transaction Type
            {isEditing && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">(cannot be changed)</span>
            )}
          </Label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => !isEditing && setTransactionType("income")}
              disabled={isEditing}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 font-medium transition-all",
                transactionType === "income"
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-700"
                  : "border-border/60 bg-background text-muted-foreground",
                !isEditing && transactionType !== "income" && "hover:border-emerald-500/50 hover:bg-emerald-500/5",
                isEditing && "cursor-not-allowed opacity-60"
              )}
            >
              <ArrowDownCircle className={cn(
                "size-5",
                transactionType === "income" ? "text-emerald-600" : "text-muted-foreground"
              )} />
              <span>Income</span>
            </button>
            <button
              type="button"
              onClick={() => !isEditing && setTransactionType("expense")}
              disabled={isEditing}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 font-medium transition-all",
                transactionType === "expense"
                  ? "border-rose-500 bg-rose-500/10 text-rose-700"
                  : "border-border/60 bg-background text-muted-foreground",
                !isEditing && transactionType !== "expense" && "hover:border-rose-500/50 hover:bg-rose-500/5",
                isEditing && "cursor-not-allowed opacity-60"
              )}
            >
              <ArrowUpCircle className={cn(
                "size-5",
                transactionType === "expense" ? "text-rose-600" : "text-muted-foreground"
              )} />
              <span>Expense</span>
            </button>
          </div>
        </div>

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
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <Label className="text-sm font-semibold text-foreground">
              Line Items
              {isLineItemsLocked && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-muted-foreground">
                  <Lock className="size-3" /> Locked
                </span>
              )}
            </Label>
            <div className="flex items-center gap-2">
              {!isLineItemsLocked && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={excelImport.downloadTemplate}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <Download className="size-3.5" />
                    Template
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsImportDialogOpen(true)}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <Upload className="size-3.5" />
                    Import Excel
                  </Button>
                </>
              )}
              <span className="text-sm text-muted-foreground">
                {lines.length} {lines.length === 1 ? "item" : "items"}
              </span>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-hidden rounded-xl border border-border/60">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="w-10 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      #
                    </th>
                    <th className="min-w-[160px] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Account <span className="text-destructive">*</span>
                    </th>
                    <th className="min-w-[180px] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Category <span className="text-destructive">*</span>
                    </th>
                    <th className="min-w-[140px] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Fund <span className="text-destructive">*</span>
                    </th>
                    <th className="min-w-[140px] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Source <span className="text-destructive">*</span>
                    </th>
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
                    <td colSpan={transactionType === "expense" ? 6 : 5} className="px-3 py-3">
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
                        transactionType === "income" ? "text-emerald-600" : "text-rose-600"
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-6">
          {/* Left side - Back/Cancel button */}
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push(cancelUrl)}
            disabled={isSubmitting}
          >
            <ArrowLeft className="mr-2 size-4" />
            {isEditing && currentStatus && currentStatus !== 'draft' ? 'Back' : 'Cancel'}
          </Button>

          {/* Right side - Action buttons based on status */}
          <div className="flex gap-3">
            {/* Draft or New: Show Save Draft + Submit */}
            {canSubmit && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSubmit(true)}
                  disabled={isSubmitting}
                >
                  <Save className="mr-2 size-4" />
                  Save as Draft
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSubmit(false)}
                  disabled={isSubmitting}
                  className={cn(
                    transactionType === "income"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
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
                className="border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
              >
                <RotateCcw className="mr-2 size-4" />
                {isSubmitting ? "Recalling..." : "Recall to Draft"}
              </Button>
            )}

            {/* Approved: Show status message (no edits allowed, only authorized users can post) */}
            {currentStatus === 'approved' && (
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-700">
                <CheckCircle2 className="size-4" />
                Awaiting posting by authorized user
              </div>
            )}

            {/* Posted: Show posted confirmation */}
            {currentStatus === 'posted' && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
                <Lock className="size-4" />
                Posted to ledger
              </div>
            )}

            {/* Voided: Show voided status */}
            {currentStatus === 'voided' && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
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
          className="sm:max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">
            {submitProgress === 100 ? "Transaction Complete" : "Processing Transaction"}
          </DialogTitle>
          <div className="flex flex-col items-center gap-6 py-4">
            {/* Spinner or Checkmark */}
            <div className={cn(
              "flex size-16 items-center justify-center rounded-full",
              submitProgress === 100
                ? "bg-emerald-100 text-emerald-600"
                : "bg-primary/10 text-primary"
            )}>
              {submitProgress === 100 ? (
                <CheckCircle2 className="size-8" />
              ) : (
                <Loader2 className="size-8 animate-spin" />
              )}
            </div>

            {/* Status Text */}
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground">
                {submitProgress === 100 ? "Complete!" : "Processing..."}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {submitStatus}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full space-y-2">
              <Progress value={submitProgress} className="h-2" />
              <p className="text-center text-xs text-muted-foreground">
                {submitProgress}%
              </p>
            </div>

            {/* Info Text */}
            {submitProgress < 100 && (
              <p className="text-center text-xs text-muted-foreground">
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
