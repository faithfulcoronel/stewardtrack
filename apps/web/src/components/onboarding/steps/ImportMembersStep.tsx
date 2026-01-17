'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  X,
  Loader2,
  Users,
  Building2,
  Wallet,
  FolderOpen,
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

interface ImportMembersStepProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface ImportSummary {
  members: number;
  membershipStatuses: number;
  financialSources: number;
  funds: number;
  incomeCategories: number;
  expenseCategories: number;
  budgetCategories: number;
  openingBalances: number;
}

interface PreviewData {
  members: Array<{
    first_name: string;
    last_name: string;
    email?: string;
    membership_status?: string;
  }>;
  summary: ImportSummary;
}

interface ValidationError {
  sheet: string;
  row: number;
  column?: string;
  message: string;
}

type ImportState = 'idle' | 'uploading' | 'preview' | 'importing' | 'success' | 'error';

// ============================================================================
// Summary Card Component
// ============================================================================

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  count: number;
  color: string;
}

function SummaryCard({ icon, label, count, color }: SummaryCardProps) {
  return (
    <div className={cn('flex items-center gap-3 p-3 rounded-lg', color)}>
      <div className="p-2 rounded-md bg-white/50 dark:bg-black/20">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold">{count}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ImportMembersStep({ onComplete, onSkip }: ImportMembersStepProps) {
  const [state, setState] = useState<ImportState>('idle');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportSummary | null>(null);

  // ============================================================================
  // File Handlers
  // ============================================================================

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleFileSelect = async (file: File) => {
    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setState('uploading');
    setErrors([]);
    setWarnings([]);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/onboarding/import-preview', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse file');
      }

      if (!data.parseResult.success) {
        setErrors(data.parseResult.errors || []);
        setState('error');
        return;
      }

      if (data.validationResult && !data.validationResult.isValid) {
        setErrors(data.validationResult.errors || []);
        setWarnings(data.validationResult.warnings || []);
      } else {
        setWarnings(data.parseResult.warnings || []);
      }

      setPreviewData({
        members: data.data?.members || [],
        summary: data.summary || {},
      });
      setState('preview');
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to parse file');
      setState('error');
    }
  };

  // ============================================================================
  // Import Handler
  // ============================================================================

  const handleImport = async () => {
    if (!selectedFile) return;

    setState('importing');
    setImportProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setImportProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch('/api/onboarding/import-confirm', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setImportProgress(100);

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Import failed');
      }

      setImportResult(data.summary);
      setWarnings(data.warnings || []);
      setState('success');
      toast.success('Import completed successfully!');
      onComplete();
    } catch (error) {
      console.error('Error importing data:', error);
      toast.error(error instanceof Error ? error.message : 'Import failed');
      setState('error');
    }
  };

  // ============================================================================
  // Template Download
  // ============================================================================

  const downloadTemplate = () => {
    window.location.href = '/api/onboarding/template';
    toast.success('Template download started');
  };

  // ============================================================================
  // Reset Handler
  // ============================================================================

  const handleReset = () => {
    setState('idle');
    setSelectedFile(null);
    setPreviewData(null);
    setErrors([]);
    setWarnings([]);
    setImportProgress(0);
    setImportResult(null);
  };

  // ============================================================================
  // Render Functions
  // ============================================================================

  const renderIdleState = () => (
    <div className="space-y-6">
      {/* Introduction */}
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-primary/10">
          <FileSpreadsheet className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Import Your Data</h3>
          <p className="text-muted-foreground">
            Upload an Excel file to bulk import members, membership statuses,
            financial sources, funds, categories, and opening balances.
          </p>
        </div>
      </div>

      {/* Download Template */}
      <Card className="border-dashed">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Download className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Download Template</p>
              <p className="text-sm text-muted-foreground">
                Start with our sample template with example data
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={downloadTemplate}>
            Download
          </Button>
        </CardContent>
      </Card>

      {/* Upload Zone */}
      <div
        className={cn(
          'relative border-2 border-dashed rounded-xl p-8 text-center transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="space-y-4">
          <div className={cn(
            'mx-auto w-16 h-16 rounded-full flex items-center justify-center transition-colors',
            isDragging ? 'bg-primary/20' : 'bg-muted'
          )}>
            <Upload className={cn(
              'h-8 w-8 transition-colors',
              isDragging ? 'text-primary' : 'text-muted-foreground'
            )} />
          </div>
          <div>
            <p className="font-medium">
              {isDragging ? 'Drop your file here' : 'Drag and drop your Excel file'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to browse • .xlsx, .xls up to 10MB
            </p>
          </div>
        </div>
      </div>

      {/* Skip Option */}
      <div className="text-center">
        <Button variant="ghost" onClick={onSkip}>
          I'll import data later
        </Button>
      </div>
    </div>
  );

  const renderUploadingState = () => (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-lg font-medium">Analyzing your file...</p>
      <p className="text-muted-foreground">This may take a moment</p>
    </div>
  );

  const renderPreviewState = () => (
    <div className="space-y-6">
      {/* File Info */}
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="h-8 w-8 text-primary" />
          <div>
            <p className="font-medium">{selectedFile?.name}</p>
            <p className="text-sm text-muted-foreground">
              {(selectedFile?.size ?? 0 / 1024).toFixed(1)} KB
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset}>
          <X className="h-4 w-4 mr-1" />
          Remove
        </Button>
      </div>

      {/* Summary Cards */}
      {previewData?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard
            icon={<Users className="h-4 w-4" />}
            label="Members"
            count={previewData.summary.members}
            color="bg-blue-50 dark:bg-blue-950/30"
          />
          <SummaryCard
            icon={<Building2 className="h-4 w-4" />}
            label="Funds"
            count={previewData.summary.funds}
            color="bg-green-50 dark:bg-green-950/30"
          />
          <SummaryCard
            icon={<Wallet className="h-4 w-4" />}
            label="Sources"
            count={previewData.summary.financialSources}
            color="bg-purple-50 dark:bg-purple-950/30"
          />
          <SummaryCard
            icon={<FolderOpen className="h-4 w-4" />}
            label="Categories"
            count={
              previewData.summary.incomeCategories +
              previewData.summary.expenseCategories +
              previewData.summary.budgetCategories
            }
            color="bg-orange-50 dark:bg-orange-950/30"
          />
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-2">
              {errors.length} error(s) found that need to be fixed:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {errors.slice(0, 5).map((error, i) => (
                <li key={i}>
                  {error.sheet} {error.row > 0 && `(Row ${error.row})`}: {error.message}
                </li>
              ))}
              {errors.length > 5 && (
                <li>...and {errors.length - 5} more errors</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-2">Warnings:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Members Preview */}
      {previewData?.members && previewData.members.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Members Preview (first 10)</h4>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.members.slice(0, 10).map((member, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">
                      {member.first_name} {member.last_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.email || '—'}
                    </TableCell>
                    <TableCell>
                      {member.membership_status && (
                        <Badge variant="outline">{member.membership_status}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={handleImport}
          disabled={errors.length > 0}
          className="flex-1 gap-2"
        >
          <CheckCircle className="h-4 w-4" />
          Confirm Import
        </Button>
        <Button variant="outline" onClick={handleReset}>
          Upload Different File
        </Button>
      </div>
    </div>
  );

  const renderImportingState = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="text-lg font-medium">Importing your data...</p>
      <div className="w-full max-w-xs">
        <Progress value={importProgress} className="h-2" />
      </div>
      <p className="text-sm text-muted-foreground">
        This may take a few moments
      </p>
    </div>
  );

  const renderSuccessState = () => (
    <div className="text-center py-8 space-y-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
      >
        <div className="w-20 h-20 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
        </div>
      </motion.div>
      <div>
        <h3 className="text-xl font-semibold">Import Successful!</h3>
        <p className="text-muted-foreground mt-1">
          Your data has been imported successfully
        </p>
      </div>
      {importResult && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-lg mx-auto">
          <SummaryCard
            icon={<Users className="h-4 w-4" />}
            label="Members"
            count={importResult.membersCreated}
            color="bg-green-50 dark:bg-green-950/30"
          />
          <SummaryCard
            icon={<Building2 className="h-4 w-4" />}
            label="Funds"
            count={importResult.fundsCreated}
            color="bg-green-50 dark:bg-green-950/30"
          />
          <SummaryCard
            icon={<Wallet className="h-4 w-4" />}
            label="Sources"
            count={importResult.financialSourcesCreated}
            color="bg-green-50 dark:bg-green-950/30"
          />
          <SummaryCard
            icon={<FolderOpen className="h-4 w-4" />}
            label="Categories"
            count={
              importResult.incomeCategoriesCreated +
              importResult.expenseCategoriesCreated +
              importResult.budgetCategoriesCreated
            }
            color="bg-green-50 dark:bg-green-950/30"
          />
        </div>
      )}
    </div>
  );

  const renderErrorState = () => (
    <div className="text-center py-8 space-y-6">
      <div className="w-20 h-20 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
      </div>
      <div>
        <h3 className="text-xl font-semibold">Import Failed</h3>
        <p className="text-muted-foreground mt-1">
          There were errors in your file. Please fix them and try again.
        </p>
      </div>
      {errors.length > 0 && (
        <Alert variant="destructive" className="text-left max-w-lg mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {errors.slice(0, 5).map((error, i) => (
                <li key={i}>
                  {error.sheet} {error.row > 0 && `(Row ${error.row})`}: {error.message}
                </li>
              ))}
              {errors.length > 5 && (
                <li>...and {errors.length - 5} more errors</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      <Button onClick={handleReset}>Try Again</Button>
    </div>
  );

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={state}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
      >
        {state === 'idle' && renderIdleState()}
        {state === 'uploading' && renderUploadingState()}
        {state === 'preview' && renderPreviewState()}
        {state === 'importing' && renderImportingState()}
        {state === 'success' && renderSuccessState()}
        {state === 'error' && renderErrorState()}
      </motion.div>
    </AnimatePresence>
  );
}
