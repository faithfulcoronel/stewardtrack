'use client';

import * as React from 'react';
import { Download, Upload, FileSpreadsheet, Loader2, AlertTriangle, CheckCircle2, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// =============================================================================
// Types
// =============================================================================

interface ValidationError {
  rowNumber: number;
  code: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

interface PreviewRow {
  rowNumber: number;
  code: string;
  name: string;
  status: 'create' | 'update' | 'skip' | 'error';
  changes?: Array<{ field: string; oldValue: unknown; newValue: unknown }>;
  error?: string;
}

interface PreviewResult {
  totalRows: number;
  createCount: number;
  updateCount: number;
  skipCount: number;
  errorCount: number;
  rows: PreviewRow[];
}

interface ImportResponse {
  success: boolean;
  mode: 'validation' | 'preview' | 'execute';
  message?: string;
  error?: string;
  validation?: {
    totalRows: number;
    errorCount: number;
    warningCount: number;
    errors: ValidationError[];
  };
  preview?: PreviewResult;
  result?: {
    success: boolean;
    processed: number;
    created: number;
    updated: number;
    errors: Array<{ code: string; error: string }>;
  };
}

// =============================================================================
// Component
// =============================================================================

export interface ProductOfferingImportExportActionsProps {
  onImportComplete?: () => void;
}

export function ProductOfferingImportExportActions({
  onImportComplete,
}: ProductOfferingImportExportActionsProps) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewData, setPreviewData] = React.useState<ImportResponse | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Handle template download
  const handleDownloadTemplate = async () => {
    if (isDownloadingTemplate) return;
    setIsDownloadingTemplate(true);
    const toastId = toast.loading('Preparing template...');
    try {
      const response = await fetch('/api/licensing/product-offerings/import/template', {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to download template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `product-offerings-import-template-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Template downloaded successfully', { id: toastId });
    } catch (error) {
      console.error('Download error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to download template', { id: toastId });
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  // Handle export all offerings
  const handleExportAll = async () => {
    if (isExporting) return;
    setIsExporting(true);
    const toastId = toast.loading('Exporting offerings...');
    try {
      const response = await fetch('/api/licensing/product-offerings/export?includeInactive=true', {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to export offerings');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `product-offerings-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Offerings exported successfully', { id: toastId });
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to export offerings', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validExtensions = ['.xlsx', '.xls'];
    const isValid = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!isValid) {
      toast.error('Please select a valid Excel file (.xlsx or .xls)');
      return;
    }

    setSelectedFile(file);
    setPreviewData(null);
    await handlePreview(file);
  };

  // Handle preview
  const handlePreview = async (file: File) => {
    setIsUploading(true);
    const toastId = toast.loading('Processing file...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', 'preview');

      const response = await fetch('/api/licensing/product-offerings/import', {
        method: 'POST',
        body: formData,
      });

      const result = (await response.json()) as ImportResponse;
      setPreviewData(result);

      if (result.success && result.preview) {
        toast.success(`Found ${result.preview.totalRows} rows to process`, { id: toastId });
      } else if (result.mode === 'validation' && !result.success) {
        toast.error(`Validation failed: ${result.validation?.errorCount || 0} errors`, { id: toastId });
      } else {
        toast.dismiss(toastId);
      }
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Failed to preview file', { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle import
  const handleImport = async () => {
    if (!selectedFile || !previewData) return;

    setIsImporting(true);
    const toastId = toast.loading('Importing offerings...');
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('mode', 'execute');

      const response = await fetch('/api/licensing/product-offerings/import', {
        method: 'POST',
        body: formData,
      });

      const result = (await response.json()) as ImportResponse;

      if (result.success && result.result) {
        toast.success(
          result.message ||
            `Import completed: ${result.result.created} created, ${result.result.updated} updated`,
          { id: toastId }
        );
        handleClose();
        onImportComplete?.();
      } else {
        const errorMsg =
          result.error ||
          result.message ||
          (result.result?.errors?.[0]?.error) ||
          'Import failed';
        toast.error(errorMsg, { id: toastId });
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import offerings', { id: toastId });
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
      fileInputRef.current.value = '';
    }
  };

  // Reset file selection
  const handleReset = () => {
    setSelectedFile(null);
    setPreviewData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Get preview counts
  const getPreviewCounts = () => {
    if (!previewData?.preview) return null;
    return {
      total: previewData.preview.totalRows,
      create: previewData.preview.createCount,
      update: previewData.preview.updateCount,
      skip: previewData.preview.skipCount,
    };
  };

  // Check if we can proceed with import
  const canImport = () => {
    if (!previewData) return false;
    if (previewData.mode === 'validation' && !previewData.success) return false;
    if (previewData.preview) {
      return previewData.preview.createCount > 0 || previewData.preview.updateCount > 0;
    }
    return false;
  };

  return (
    <div className="flex items-center gap-2">
      {/* Export Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={isExporting || isDownloadingTemplate}>
            {isExporting || isDownloadingTemplate ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleExportAll} disabled={isExporting}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export All Offerings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDownloadTemplate} disabled={isDownloadingTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Import Button */}
      <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(true)}>
        <Upload className="h-4 w-4 mr-2" />
        Import
      </Button>

      {/* Import Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleClose}>
        <DialogContent className="max-h-[90vh] w-full max-w-2xl overflow-hidden p-0">
          {/* Dialog Header */}
          <div className="relative border-b border-border/40 bg-gradient-to-b from-primary/5 to-transparent p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-lg sm:text-xl">
                <div className="flex size-10 sm:size-11 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                  <FileSpreadsheet className="size-5 sm:size-6 text-primary" />
                </div>
                Import Product Offerings
              </DialogTitle>
              <DialogDescription className="text-sm mt-1.5">
                Upload an Excel file to bulk create or update product offerings.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-4 p-4 sm:p-6 max-h-[60vh] overflow-y-auto">
            {/* Download Template Section */}
            <div
              className={cn(
                'flex flex-col gap-3 rounded-xl p-3 sm:p-4',
                'sm:flex-row sm:items-center sm:justify-between',
                'border border-dashed border-border/60',
                'bg-gradient-to-br from-muted/40 to-muted/20',
                'transition-colors hover:border-primary/30'
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                  <FileSpreadsheet className="size-4 sm:size-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Need the template?</p>
                  <p className="text-xs text-muted-foreground">
                    Download with column definitions and reference data
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                disabled={isDownloadingTemplate}
                className="gap-1.5 border-border/60 hover:border-primary/40 hover:bg-primary/5"
              >
                {isDownloadingTemplate ? (
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
                'relative cursor-pointer rounded-xl border-2 border-dashed p-6 sm:p-8 text-center',
                'transition-all duration-200',
                selectedFile
                  ? 'border-primary/50 bg-primary/5 shadow-sm'
                  : 'border-border/60 hover:border-primary/40 hover:bg-muted/30'
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
                  <p className="text-sm text-muted-foreground">Processing file...</p>
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

            {/* Validation Errors */}
            {previewData?.mode === 'validation' && !previewData.success && previewData.validation && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <div className="mb-2 flex items-center gap-2 text-destructive">
                  <AlertTriangle className="size-4" />
                  <span className="text-sm font-semibold">
                    {previewData.validation.errorCount} validation error
                    {previewData.validation.errorCount > 1 ? 's' : ''} found
                  </span>
                </div>
                <ul className="max-h-32 space-y-1 overflow-y-auto text-xs text-destructive/80">
                  {previewData.validation.errors
                    .filter((e) => e.severity === 'error')
                    .slice(0, 20)
                    .map((error, index) => (
                      <li key={index}>
                        Row {error.rowNumber} ({error.code}): {error.field} - {error.message}
                      </li>
                    ))}
                  {previewData.validation.errorCount > 20 && (
                    <li className="font-medium">
                      ... and {previewData.validation.errorCount - 20} more errors
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Preview Results */}
            {previewData?.mode === 'preview' && previewData.preview && (
              <>
                {/* Summary */}
                <div
                  className={cn(
                    'flex flex-wrap items-center gap-3 sm:gap-4 p-3 rounded-xl',
                    'bg-muted/30 border border-border/40'
                  )}
                >
                  <span className="text-sm text-muted-foreground">
                    Total:{' '}
                    <span className="font-semibold text-foreground">
                      {previewData.preview.totalRows}
                    </span>{' '}
                    row{previewData.preview.totalRows !== 1 ? 's' : ''}
                  </span>
                  {previewData.preview.createCount > 0 && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle2 className="size-3 mr-1" />
                      {previewData.preview.createCount} new
                    </Badge>
                  )}
                  {previewData.preview.updateCount > 0 && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      <RefreshCcw className="size-3 mr-1" />
                      {previewData.preview.updateCount} update
                    </Badge>
                  )}
                  {previewData.preview.skipCount > 0 && (
                    <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                      {previewData.preview.skipCount} unchanged
                    </Badge>
                  )}
                </div>

                {/* Preview Table */}
                {previewData.preview.rows.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">Preview</p>
                      {canImport() && (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
                          <CheckCircle2 className="size-3" />
                          Ready to import
                        </span>
                      )}
                    </div>
                    <div className="max-h-48 overflow-auto rounded-xl border border-border/40 text-xs">
                      <table className="w-full">
                        <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold text-foreground">
                              Code
                            </th>
                            <th className="px-3 py-2 text-left font-semibold text-foreground">
                              Name
                            </th>
                            <th className="px-3 py-2 text-center font-semibold text-foreground">
                              Status
                            </th>
                            <th className="px-3 py-2 text-left font-semibold text-foreground">
                              Changes
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.preview.rows.slice(0, 15).map((row, index) => (
                            <tr
                              key={index}
                              className="border-t border-border/30 hover:bg-muted/30 transition-colors"
                            >
                              <td className="px-3 py-2 font-mono">{row.code}</td>
                              <td className="px-3 py-2">{row.name}</td>
                              <td className="px-3 py-2 text-center">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-xs',
                                    row.status === 'create' &&
                                      'bg-green-50 text-green-700 border-green-200',
                                    row.status === 'update' &&
                                      'bg-blue-50 text-blue-700 border-blue-200',
                                    row.status === 'skip' &&
                                      'bg-gray-50 text-gray-700 border-gray-200',
                                    row.status === 'error' &&
                                      'bg-red-50 text-red-700 border-red-200'
                                  )}
                                >
                                  {row.status}
                                </Badge>
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">
                                {row.changes && row.changes.length > 0
                                  ? `${row.changes.length} field${row.changes.length > 1 ? 's' : ''}`
                                  : row.status === 'create'
                                  ? 'New offering'
                                  : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {previewData.preview.rows.length > 15 && (
                      <p className="text-center text-xs text-muted-foreground">
                        +{previewData.preview.rows.length - 15} more rows
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
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="hover:bg-muted/60"
                >
                  Clear
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                className="border-border/60"
              >
                Cancel
              </Button>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleImport}
              disabled={!canImport() || isImporting || isUploading}
              className="w-full gap-1.5 sm:w-auto transition-all hover:shadow-md hover:shadow-primary/20"
            >
              {isImporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              {isImporting
                ? 'Importing...'
                : `Import ${getPreviewCounts()?.create || 0} new, ${getPreviewCounts()?.update || 0} update`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProductOfferingImportExportActions;
