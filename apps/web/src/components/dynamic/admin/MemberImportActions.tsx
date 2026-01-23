"use client";

import * as React from "react";
import { Download, Upload, FileSpreadsheet, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
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

// =============================================================================
// Types
// =============================================================================

interface ImportError {
  row: number;
  field: string;
  message: string;
}

interface PreviewResult {
  success: boolean;
  preview: boolean;
  data: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
  };
  errors: Array<{ sheet: string; row: number; field: string; message: string }>;
  validMembers: Array<{
    first_name: string;
    last_name: string;
    email?: string | null;
  }>;
}

interface ImportResult {
  success: boolean;
  data?: {
    imported_count: number;
    error_count: number;
    errors?: Array<{ row?: number; field?: string; message: string }>;
  };
  errors?: Array<{ row?: number; field?: string; message: string }>;
  message?: string;
  error?: string;
}

// =============================================================================
// Component
// =============================================================================

export interface MemberImportActionsProps {
  variant?: "primary" | "secondary" | "outline";
  showLabels?: boolean;
}

export function MemberImportActions({
  variant = "primary",
  showLabels = true,
}: MemberImportActionsProps) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewData, setPreviewData] = React.useState<PreviewResult | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Handle template download
  const handleDownloadTemplate = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch("/api/members/import", {
        method: "GET",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to download template");
      }

      // Create blob from response and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `members-import-template-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Template downloaded successfully");
    } catch (error) {
      console.error("Download error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to download template");
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle export members
  const handleExportMembers = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/members/export", {
        method: "GET",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to export members");
      }

      // Create blob from response and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `members-export-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Members exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to export members");
    } finally {
      setIsExporting(false);
    }
  };

  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validExtensions = [".xlsx", ".xls"];
    const isValid = validExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!isValid) {
      toast.error("Please select a valid Excel file (.xlsx or .xls)");
      return;
    }

    setSelectedFile(file);
    setPreviewData(null);
    await handlePreview(file);
  };

  // Handle preview
  const handlePreview = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("preview", "true");

      const response = await fetch("/api/members/import", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as PreviewResult;
      setPreviewData(result);
    } catch (error) {
      console.error("Preview error:", error);
      toast.error("Failed to preview file");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle import
  const handleImport = async () => {
    if (!selectedFile || !previewData) return;

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("preview", "false");

      const response = await fetch("/api/members/import", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as ImportResult;

      if (result.success) {
        toast.success(result.message || "Members imported successfully");
        handleClose();
        // Refresh the page to show new members
        window.location.reload();
      } else {
        // Get error details
        const errors = result.errors || result.data?.errors || [];
        if (errors.length > 0) {
          const firstError = errors[0];
          const errorDetail = firstError.row
            ? `Row ${firstError.row}: ${firstError.message}`
            : firstError.message;
          toast.error(result.message || errorDetail);
        } else {
          toast.error(result.error || result.message || "Import failed");
        }
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import members");
    } finally {
      setIsImporting(false);
    }
  };

  // Handle dialog close
  const handleClose = () => {
    setIsDialogOpen(false);
    setSelectedFile(null);
    setPreviewData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Reset file selection
  const handleReset = () => {
    setSelectedFile(null);
    setPreviewData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Download Template Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownloadTemplate}
        disabled={isDownloading}
        className={cn(
          "gap-1.5",
          "border-border/60 hover:border-primary/40 hover:bg-primary/5",
          "transition-colors"
        )}
      >
        {isDownloading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
        {showLabels && <span className="hidden sm:inline">Download Template</span>}
      </Button>

      {/* Export Members Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportMembers}
        disabled={isExporting}
        className={cn(
          "gap-1.5",
          "border-border/60 hover:border-emerald-500/40 hover:bg-emerald-500/5",
          "transition-colors"
        )}
      >
        {isExporting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
        {showLabels && <span className="hidden sm:inline">Export Members</span>}
      </Button>

      {/* Import Button */}
      <Button
        variant={variant}
        size="sm"
        onClick={() => setIsDialogOpen(true)}
        className="gap-1.5 transition-all hover:shadow-md hover:shadow-primary/20"
      >
        <Upload className="size-4" />
        {showLabels && "Import Members"}
      </Button>

      {/* Import Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleClose}>
        <DialogContent className="max-h-[90vh] w-full max-w-[calc(100vw-2rem)] overflow-hidden sm:max-w-md p-0">
          {/* Dialog Header with accent */}
          <div className="relative border-b border-border/40 bg-gradient-to-b from-primary/5 to-transparent p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-lg sm:text-xl">
                <div className="flex size-10 sm:size-11 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                  <FileSpreadsheet className="size-5 sm:size-6 text-primary" />
                </div>
                Import Members
              </DialogTitle>
              <DialogDescription className="text-sm mt-1.5">
                Upload an Excel file to import members in bulk.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-4 p-4 sm:p-6">
            {/* Download Template Section */}
            <div className={cn(
              "flex flex-col gap-3 rounded-xl p-3 sm:p-4",
              "sm:flex-row sm:items-center sm:justify-between",
              "border border-dashed border-border/60",
              "bg-gradient-to-br from-muted/40 to-muted/20",
              "transition-colors hover:border-primary/30"
            )}>
              <div className="flex items-center gap-3">
                <div className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                  <FileSpreadsheet className="size-4 sm:size-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Need the template?</p>
                  <p className="text-xs text-muted-foreground">
                    Download with instructions
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                disabled={isDownloading}
                className="gap-1.5 border-border/60 hover:border-primary/40 hover:bg-primary/5"
              >
                {isDownloading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                Download Template
              </Button>
            </div>

            {/* File Upload Area */}
            <div
              className={cn(
                "relative cursor-pointer rounded-xl border-2 border-dashed p-6 sm:p-8 text-center",
                "transition-all duration-200",
                selectedFile
                  ? "border-primary/50 bg-primary/5 shadow-sm"
                  : "border-border/60 hover:border-primary/40 hover:bg-muted/30"
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

              {isUploading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                    <Loader2 className="size-7 animate-spin text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Processing file...
                  </p>
                </div>
              ) : selectedFile ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 ring-2 ring-primary/20">
                    <FileSpreadsheet className="size-7 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Click to select a different file
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40 shadow-inner">
                    <Upload className="size-7 text-muted-foreground/60" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Click to upload Excel file
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Supports .xlsx and .xls files
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Preview Results */}
            {previewData && (
              <>
                {/* Errors */}
                {previewData.errors && previewData.errors.length > 0 && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                    <div className="mb-2 flex items-center gap-2 text-destructive">
                      <AlertTriangle className="size-4" />
                      <span className="text-sm font-semibold">
                        {previewData.errors.length} error{previewData.errors.length > 1 ? "s" : ""} found
                      </span>
                    </div>
                    <ul className="max-h-32 space-y-1 overflow-y-auto text-xs text-destructive/80">
                      {previewData.errors.slice(0, 20).map((error, index) => (
                        <li key={index}>
                          Row {error.row}: {error.field} - {error.message}
                        </li>
                      ))}
                      {previewData.errors.length > 20 && (
                        <li className="font-medium">
                          ... and {previewData.errors.length - 20} more errors
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Summary */}
                <div className={cn(
                  "flex flex-wrap items-center gap-3 sm:gap-4 p-3 rounded-xl",
                  "bg-muted/30 border border-border/40"
                )}>
                  <span className="text-sm text-muted-foreground">
                    Total: <span className="font-semibold text-foreground">{previewData.data.totalRows}</span> row{previewData.data.totalRows > 1 ? "s" : ""}
                  </span>
                  {previewData.data.validRows > 0 && (
                    <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-4" />
                      <span className="font-semibold">{previewData.data.validRows}</span> valid
                    </span>
                  )}
                  {previewData.data.invalidRows > 0 && (
                    <span className="flex items-center gap-1.5 text-sm text-destructive">
                      <AlertTriangle className="size-4" />
                      <span className="font-semibold">{previewData.data.invalidRows}</span> invalid
                    </span>
                  )}
                </div>

                {/* Preview Table */}
                {previewData.validMembers && previewData.validMembers.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">Preview</p>
                      {previewData.data.validRows > 0 && previewData.errors.length === 0 && (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
                          <CheckCircle2 className="size-3" />
                          Ready to import
                        </span>
                      )}
                    </div>
                    <div className="max-h-40 overflow-auto rounded-xl border border-border/40 text-xs">
                      <table className="w-full">
                        <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold text-foreground">Name</th>
                            <th className="hidden px-3 py-2 text-left font-semibold text-foreground sm:table-cell">Email</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.validMembers.slice(0, 10).map((member, index) => (
                            <tr key={index} className="border-t border-border/30 hover:bg-muted/30 transition-colors">
                              <td className="px-3 py-2 font-medium">
                                {member.first_name} {member.last_name}
                              </td>
                              <td className="hidden truncate px-3 py-2 text-muted-foreground sm:table-cell">
                                {member.email || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {previewData.validMembers.length > 10 && (
                      <p className="text-center text-xs text-muted-foreground">
                        +{previewData.validMembers.length - 10} more
                        {previewData?.data?.validRows > 50 && " (will be imported in batches)"}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Dialog Actions */}
          <div className="flex flex-col-reverse gap-2 border-t border-border/40 p-4 sm:p-6 sm:flex-row sm:justify-end bg-muted/20">
            <div className="flex gap-2">
              {selectedFile && (
                <Button type="button" variant="ghost" size="sm" onClick={handleReset} className="hover:bg-muted/60">
                  Clear
                </Button>
              )}
              <Button type="button" variant="outline" size="sm" onClick={handleClose} className="border-border/60">
                Cancel
              </Button>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleImport}
              disabled={
                !previewData ||
                previewData.data.validRows === 0 ||
                isImporting ||
                isUploading
              }
              className="w-full gap-1.5 sm:w-auto transition-all hover:shadow-md hover:shadow-primary/20"
            >
              {isImporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              {isImporting
                ? previewData?.data?.validRows && previewData.data.validRows > 50
                  ? "Importing (batched)..."
                  : "Importing..."
                : `Import ${previewData?.data?.validRows ?? ""} member${previewData?.data?.validRows !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MemberImportActions;
