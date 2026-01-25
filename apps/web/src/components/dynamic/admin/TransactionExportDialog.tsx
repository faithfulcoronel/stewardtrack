'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Spinner } from '@/components/ui/spinner';
import { generateExcel } from '@/lib/pdf/reportExports';
import type { ReportExportConfig, ReportSection, ReportColumn } from '@/lib/pdf/reportExports';
import { toast } from 'sonner';
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
  subYears,
  startOfQuarter,
  endOfQuarter,
  subQuarters,
} from 'date-fns';

interface TransactionExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantName?: string;
  currency?: string;
}

interface ExportTransaction {
  id: string;
  date: string;
  type: string;
  status: string;
  accountName: string;
  category: string;
  fund: string;
  source: string;
  amount: number;
  description: string;
}

export function TransactionExportDialog({
  open,
  onOpenChange,
  tenantName = 'Organization',
  currency = 'PHP',
}: TransactionExportDialogProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isExporting, setIsExporting] = useState(false);

  // Quick date range presets
  const datePresets = useMemo(() => [
    {
      label: 'This month',
      getRange: () => {
        const now = new Date();
        return { start: startOfMonth(now), end: endOfMonth(now) };
      },
    },
    {
      label: 'Last month',
      getRange: () => {
        const lastMonth = subMonths(new Date(), 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      },
    },
    {
      label: 'This quarter',
      getRange: () => {
        const now = new Date();
        return { start: startOfQuarter(now), end: endOfQuarter(now) };
      },
    },
    {
      label: 'Last quarter',
      getRange: () => {
        const lastQuarter = subQuarters(new Date(), 1);
        return { start: startOfQuarter(lastQuarter), end: endOfQuarter(lastQuarter) };
      },
    },
    {
      label: 'This year',
      getRange: () => {
        const now = new Date();
        return { start: startOfYear(now), end: endOfYear(now) };
      },
    },
    {
      label: 'Last year',
      getRange: () => {
        const lastYear = subYears(new Date(), 1);
        return { start: startOfYear(lastYear), end: endOfYear(lastYear) };
      },
    },
  ], []);

  const handlePresetClick = useCallback((preset: typeof datePresets[0]) => {
    const { start, end } = preset.getRange();
    setStartDate(start);
    setEndDate(end);
  }, []);

  const handleExport = useCallback(async () => {
    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates');
      return;
    }

    if (startDate > endDate) {
      toast.error('Start date must be before end date');
      return;
    }

    setIsExporting(true);

    try {
      // Fetch transactions from API with date filter
      const params = new URLSearchParams({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });

      const response = await fetch(`/api/finance/transactions/export?${params}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch transactions');
      }

      const data = await response.json();
      const transactions: ExportTransaction[] = data.transactions || [];

      if (transactions.length === 0) {
        toast.warning('No transactions found for the selected date range');
        setIsExporting(false);
        return;
      }

      // Prepare export config
      const config: ReportExportConfig = {
        tenantName: data.tenantName || tenantName,
        title: 'Transaction Export',
        currency: data.currency || currency,
        periodStart: startDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }),
        periodEnd: endDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }),
      };

      // Define columns
      const columns: ReportColumn[] = [
        { field: 'date', headerName: 'Date', type: 'date', width: 12 },
        { field: 'type', headerName: 'Type', type: 'text', width: 10 },
        { field: 'status', headerName: 'Status', type: 'text', width: 10 },
        { field: 'accountName', headerName: 'Account', type: 'text', width: 20 },
        { field: 'category', headerName: 'Category', type: 'text', width: 20 },
        { field: 'fund', headerName: 'Fund', type: 'text', width: 15 },
        { field: 'source', headerName: 'Source', type: 'text', width: 15 },
        { field: 'amount', headerName: 'Amount', type: 'currency', width: 15, align: 'right' },
        { field: 'description', headerName: 'Description', type: 'text', width: 30 },
      ];

      // Prepare section data
      const section: ReportSection = {
        title: 'Transactions',
        columns,
        rows: transactions.map((tx) => ({
          date: tx.date,
          type: tx.type,
          status: tx.status,
          accountName: tx.accountName || '—',
          category: tx.category || '—',
          fund: tx.fund || '—',
          source: tx.source || '—',
          amount: tx.amount,
          description: tx.description || '—',
        })),
      };

      // Calculate totals
      const totalAmount = transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
      const totals = {
        label: 'Total',
        values: {
          amount: totalAmount,
        },
      };

      // Generate Excel file
      await generateExcel(config, [section], totals);

      toast.success(`Exported ${transactions.length} transactions`);
      onOpenChange(false);
    } catch (error) {
      console.error('[TransactionExportDialog] Export error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to export transactions');
    } finally {
      setIsExporting(false);
    }
  }, [startDate, endDate, tenantName, currency, onOpenChange]);

  const handleClear = useCallback(() => {
    setStartDate(undefined);
    setEndDate(undefined);
  }, []);

  // Set default date range when dialog opens
  React.useEffect(() => {
    if (open && !startDate && !endDate) {
      // Default to current month
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(firstDay);
      setEndDate(lastDay);
    }
  }, [open, startDate, endDate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Export transactions</DialogTitle>
          <DialogDescription>
            Select a date range to export transactions to Excel. The export will include date, type, status, account, category, fund, source, amount, and description.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Quick date range presets */}
          <div className="grid gap-2">
            <Label className="text-xs text-muted-foreground">Quick select</Label>
            <div className="flex flex-wrap gap-2">
              {datePresets.map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isExporting}
                  onClick={() => handlePresetClick(preset)}
                  className="text-xs"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Start date</Label>
              <DatePicker
                mode="single"
                value={startDate}
                onChange={setStartDate}
                isDisabled={isExporting}
                placeholder="Select start date"
              />
            </div>

            <div className="grid gap-2">
              <Label>End date</Label>
              <DatePicker
                mode="single"
                value={endDate}
                onChange={setEndDate}
                isDisabled={isExporting}
                placeholder="Select end date"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClear}
            disabled={isExporting}
            className="mt-2 sm:mt-0"
          >
            Clear dates
          </Button>
          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleExport}
              disabled={isExporting || !startDate || !endDate}
            >
              {isExporting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Exporting...
                </>
              ) : (
                'Export to Excel'
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
