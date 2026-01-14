"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save, X, ArrowUpCircle, ArrowDownCircle, Check, ChevronsUpDown, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

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
}

function InlineCombobox({
  options,
  value,
  onChange,
  placeholder = "Select...",
  emptyMessage = "No results found.",
  allowClear = false,
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-9 w-full justify-between border-transparent bg-transparent px-2 text-left font-normal hover:border-border hover:bg-transparent focus:border-border",
            !selectedOption && "text-muted-foreground"
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
  headline = "Record Transaction",
  pageDescription = "Enter income or expense transaction details.",
  accountOptions = [],
  categoryOptions = [],
  fundOptions = [],
  sourceOptions = [],
  budgetOptions = [],
  currency = "USD",
  defaultTransactionType = "income",
  cancelUrl = "/admin/finance/transactions",
}: AdminTransactionEntryProps) {
  const router = useRouter();

  // Form state
  const [transactionType, setTransactionType] = React.useState<"income" | "expense">(defaultTransactionType);
  const [transactionDate, setTransactionDate] = React.useState<Date>(() => new Date());
  const [datePickerOpen, setDatePickerOpen] = React.useState(false);
  const [reference, setReference] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [lines, setLines] = React.useState<TransactionLine[]>([createEmptyLine(1)]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

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
        line.id === lineId ? { ...line, [field]: value } : line
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

    setIsSubmitting(true);

    try {
      const payload = {
        transactionType,
        transactionDate: format(transactionDate, "yyyy-MM-dd"),
        reference: reference.trim() || null,
        description: description.trim(),
        status: asDraft ? "draft" : "submitted",
        lines: lines.map((line) => ({
          accountId: line.accountId || null,
          categoryId: line.categoryId,
          fundId: line.fundId || null,
          sourceId: line.sourceId || null,
          budgetId: line.budgetId || null,
          amount: line.amount,
          description: line.description || null,
        })),
        totalAmount: total,
      };

      const response = await fetch("/api/metadata/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: {
            id: asDraft ? "admin-finance.transactions.saveDraft" : "admin-finance.transactions.submit",
            params: payload,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to save transaction");
      }

      toast.success(asDraft ? "Draft saved successfully" : "Transaction submitted successfully");
      router.push(cancelUrl);
    } catch (error) {
      console.error("Transaction submission error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header - Dynamic based on transaction type */}
      <header className="space-y-1">
        <p className="text-sm font-medium text-primary">{eyebrow}</p>
        <h1 className="text-2xl font-bold text-foreground">
          {transactionType === "income" ? "Record income" : "Record expense"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {transactionType === "income"
            ? "Enter details for incoming funds and donations."
            : "Enter details for outgoing payments and expenses."}
        </p>
      </header>

      {/* Main Form Container */}
      <div className="rounded-3xl border border-border/60 bg-background p-6 shadow-sm">
        {/* Transaction Type Toggle */}
        <div className="mb-6">
          <Label className="mb-3 block text-sm font-semibold text-foreground">
            Transaction Type
          </Label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTransactionType("income")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 font-medium transition-all",
                transactionType === "income"
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-700"
                  : "border-border/60 bg-background text-muted-foreground hover:border-emerald-500/50 hover:bg-emerald-500/5"
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
              onClick={() => setTransactionType("expense")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 font-medium transition-all",
                transactionType === "expense"
                  ? "border-rose-500 bg-rose-500/10 text-rose-700"
                  : "border-border/60 bg-background text-muted-foreground hover:border-rose-500/50 hover:bg-rose-500/5"
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
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="transactionDate"
                  variant="outline"
                  className={cn(
                    "h-11 w-full justify-start text-left font-normal",
                    !transactionDate && "text-muted-foreground"
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
                  initialFocus
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
            />
          </div>
        </div>

        {/* Line Items Section */}
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <Label className="text-sm font-semibold text-foreground">
              Line Items
            </Label>
            <span className="text-sm text-muted-foreground">
              {lines.length} {lines.length === 1 ? "item" : "items"}
            </span>
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
                      className="border-b border-border/40 transition-colors hover:bg-muted/20"
                    >
                      <td className="px-3 py-2 text-center text-sm font-medium text-muted-foreground">
                        {index + 1}
                      </td>
                      <td className="px-1 py-1">
                        <InlineCombobox
                          options={accountOptions}
                          value={line.accountId}
                          onChange={(value) => handleUpdateLine(line.id, "accountId", value)}
                          placeholder="Select account"
                          emptyMessage="No accounts available"
                          allowClear
                        />
                      </td>
                      <td className="px-1 py-1">
                        <InlineCombobox
                          options={filteredCategoryOptions}
                          value={line.categoryId}
                          onChange={(value) => handleUpdateLine(line.id, "categoryId", value)}
                          placeholder="Select category"
                          emptyMessage="No categories available"
                        />
                      </td>
                      <td className="px-1 py-1">
                        <InlineCombobox
                          options={fundOptions}
                          value={line.fundId}
                          onChange={(value) => handleUpdateLine(line.id, "fundId", value)}
                          placeholder="Select fund"
                          emptyMessage="No funds available"
                        />
                      </td>
                      <td className="px-1 py-1">
                        <InlineCombobox
                          options={sourceOptions}
                          value={line.sourceId}
                          onChange={(value) => handleUpdateLine(line.id, "sourceId", value)}
                          placeholder="Select source"
                          emptyMessage="No sources available"
                        />
                      </td>
                      {transactionType === "expense" && (
                        <td className="px-1 py-1">
                          <InlineCombobox
                            options={budgetOptions}
                            value={line.budgetId}
                            onChange={(value) => handleUpdateLine(line.id, "budgetId", value)}
                            placeholder="Select budget"
                            emptyMessage="No budgets available"
                            allowClear
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
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="text"
                          value={line.description}
                          onChange={(e) => handleUpdateLine(line.id, "description", e.target.value)}
                          placeholder="Line memo"
                          className="h-9 border-transparent bg-transparent hover:border-border focus:border-border"
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
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
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border/60 bg-muted/20">
                    <td colSpan={transactionType === "expense" ? 6 : 5} className="px-3 py-3">
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

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-6">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push(cancelUrl)}
            disabled={isSubmitting}
          >
            <X className="mr-2 size-4" />
            Cancel
          </Button>
          <div className="flex gap-3">
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
              {isSubmitting ? "Submitting..." : "Submit Transaction"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminTransactionEntry;
