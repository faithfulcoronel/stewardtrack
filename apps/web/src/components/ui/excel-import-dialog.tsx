"use client";

import * as React from "react";
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ImportedRow } from "@/hooks/useExcelImport";

// =============================================================================
// TYPES
// =============================================================================

export interface ExcelImportDialogColumn<T> {
  /** Field name in the data object */
  field: keyof T;
  /** Display header */
  header: string;
  /** Column width in preview table */
  width?: string;
  /** Text alignment */
  align?: "left" | "center" | "right";
  /** Custom render function */
  render?: (value: unknown, row: T) => React.ReactNode;
  /** Whether to highlight as error if empty/invalid */
  highlightEmpty?: boolean;
}

export interface ExcelImportDialogProps<T extends Record<string, unknown>> {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Dialog title */
  title?: string;
  /** Dialog description */
  description?: string;
  /** Preview table columns */
  previewColumns: ExcelImportDialogColumn<T>[];
  /** Import hook state and actions */
  importState: {
    file: File | null;
    isProcessing: boolean;
    preview: ImportedRow<T>[];
    errors: string[];
    validCount: number;
    invalidCount: number;
    processFile: (file: File) => Promise<void>;
    downloadTemplate: () => void;
    reset: () => void;
    getValidRows: () => T[];
  };
  /** Callback when import is confirmed */
  onImport: (rows: T[]) => void;
  /** Currency for formatting (optional) */
  currency?: string;
  /** Maximum preview rows to show */
  maxPreviewRows?: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ExcelImportDialog<T extends Record<string, unknown>>({
  open,
  onOpenChange,
  title = "Import from Excel",
  description = "Upload an Excel file to import data. Download the template for the correct format.",
  previewColumns,
  importState,
  onImport,
  currency = "USD",
  maxPreviewRows = 100,
}: ExcelImportDialogProps<T>) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const {
    file,
    isProcessing,
    preview,
    errors,
    validCount,
    invalidCount,
    processFile,
    downloadTemplate,
    reset,
    getValidRows,
  } = importState;

  // Handle file selection
  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validExtensions = [".xlsx", ".xls"];
    const isValid = validExtensions.some((ext) =>
      selectedFile.name.toLowerCase().endsWith(ext)
    );

    if (!isValid) {
      toast.error("Please select a valid Excel file (.xlsx or .xls)");
      return;
    }

    await processFile(selectedFile);
  };

  // Handle dialog close
  const handleClose = () => {
    reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onOpenChange(false);
  };

  // Handle import confirmation
  const handleConfirmImport = () => {
    if (errors.length > 0) {
      toast.error("Please fix all errors before importing");
      return;
    }

    const validRows = getValidRows();
    if (validRows.length === 0) {
      toast.error("No valid rows to import");
      return;
    }

    onImport(validRows);
    handleClose();
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(value);
  };

  // Render cell value
  const renderCell = (
    column: ExcelImportDialogColumn<T>,
    row: T
  ): React.ReactNode => {
    const value = row[column.field];

    if (column.render) {
      return column.render(value, row);
    }

    if (typeof value === "number") {
      return formatCurrency(value);
    }

    return String(value ?? "—");
  };

  // Check if cell should be highlighted as error
  const isCellError = (
    column: ExcelImportDialogColumn<T>,
    row: T
  ): boolean => {
    if (!column.highlightEmpty) return false;
    const value = row[column.field];
    return (
      value === undefined ||
      value === null ||
      value === "" ||
      (typeof value === "number" && value <= 0)
    );
  };

  const displayPreview = preview.slice(0, maxPreviewRows);
  const hasMoreRows = preview.length > maxPreviewRows;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Download Template Section */}
          <div className="flex items-center justify-between rounded-lg border border-dashed border-border bg-muted/30 p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <FileSpreadsheet className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Need the correct format?</p>
                <p className="text-xs text-muted-foreground">
                  Download our template with instructions
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadTemplate}
              className="gap-1.5"
            >
              <Download className="size-4" />
              Download Template
            </Button>
          </div>

          {/* File Upload Area */}
          <div
            className={cn(
              "relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors",
              file
                ? "border-primary/50 bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/50"
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />

            {isProcessing ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Processing file...
                </p>
              </div>
            ) : file ? (
              <div className="flex flex-col items-center gap-2">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <FileSpreadsheet className="size-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Click to select a different file
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <Upload className="size-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    Click to upload Excel file
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supports .xlsx and .xls files
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Import Errors */}
          {errors.length > 0 && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <div className="mb-2 flex items-center gap-2 text-destructive">
                <AlertTriangle className="size-4" />
                <span className="text-sm font-medium">
                  {errors.length} error{errors.length > 1 ? "s" : ""} found
                </span>
              </div>
              <ul className="max-h-32 space-y-1 overflow-y-auto text-xs text-destructive/80">
                {errors.slice(0, 20).map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
                {errors.length > 20 && (
                  <li className="font-medium">
                    ... and {errors.length - 20} more errors
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Preview Summary */}
          {preview.length > 0 && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">
                Total: {preview.length} row{preview.length > 1 ? "s" : ""}
              </span>
              {validCount > 0 && (
                <span className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 className="size-3" />
                  {validCount} valid
                </span>
              )}
              {invalidCount > 0 && (
                <span className="flex items-center gap-1 text-destructive">
                  <X className="size-3" />
                  {invalidCount} invalid
                </span>
              )}
            </div>
          )}

          {/* Preview Table */}
          {preview.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Preview</p>
                {errors.length === 0 && validCount > 0 && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600">
                    <CheckCircle2 className="size-3" />
                    Ready to import
                  </span>
                )}
              </div>
              <div className="max-h-48 overflow-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium">#</th>
                      {previewColumns.map((col) => (
                        <th
                          key={String(col.field)}
                          className={cn(
                            "px-2 py-1.5 font-medium",
                            col.align === "right"
                              ? "text-right"
                              : col.align === "center"
                              ? "text-center"
                              : "text-left"
                          )}
                          style={{ width: col.width }}
                        >
                          {col.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayPreview.map((row, index) => (
                      <tr
                        key={row.id}
                        className={cn(
                          "border-t",
                          !row.isValid && "bg-destructive/5"
                        )}
                      >
                        <td className="px-2 py-1.5 text-muted-foreground">
                          {index + 1}
                        </td>
                        {previewColumns.map((col) => (
                          <td
                            key={String(col.field)}
                            className={cn(
                              "px-2 py-1.5",
                              col.align === "right"
                                ? "text-right tabular-nums"
                                : col.align === "center"
                                ? "text-center"
                                : "text-left",
                              isCellError(col, row.data) && "text-destructive"
                            )}
                          >
                            {renderCell(col, row.data)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {hasMoreRows && (
                <p className="text-center text-xs text-muted-foreground">
                  Showing first {maxPreviewRows} of {preview.length} rows
                </p>
              )}
            </div>
          )}
        </div>

        {/* Dialog Actions */}
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirmImport}
            disabled={
              errors.length > 0 || validCount === 0 || isProcessing
            }
            className="gap-1.5"
          >
            <Upload className="size-4" />
            Import{" "}
            {validCount > 0
              ? `${validCount} Row${validCount > 1 ? "s" : ""}`
              : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ExcelImportDialog;
