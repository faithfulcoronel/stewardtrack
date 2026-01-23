'use client';

import React from 'react';
import { format } from 'date-fns';
import { useSearchParams } from 'next/navigation';
import {
  Calendar as CalendarIcon,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Play,
  Printer,
  Loader2,
  FileBarChart,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface DateSelectorConfig {
  type: 'single' | 'range';
  defaultValue?: string;
  defaultStart?: string;
  defaultEnd?: string;
}

export interface SelectSelectorConfig {
  label?: string;
  options: { label: string; value: string }[];
  defaultValue?: string;
}

export interface ExportAction {
  id: string;
  label: string;
  handler?: string;
}

export interface AdminReportHeaderProps {
  /** Report title */
  title: string;
  /** Report description */
  description?: string;
  /** Current as-of date display */
  asOfDate?: string;
  /** Date selector configuration */
  dateSelector?: DateSelectorConfig | null;
  /** Fiscal year selector configuration */
  fiscalYearSelector?: SelectSelectorConfig | null;
  /** View by selector configuration */
  viewBySelector?: SelectSelectorConfig | null;
  /** Available export actions */
  exportActions?: ExportAction[] | { items?: ExportAction[] } | null;
  /** Callback when date changes */
  onDateChange?: (date: string, endDate?: string) => void;
  /** Callback when fiscal year changes */
  onFiscalYearChange?: (fiscalYearId: string) => void;
  /** Callback when view by changes */
  onViewByChange?: (viewBy: string) => void;
  /** Callback to trigger export */
  onExport?: (format: 'pdf' | 'excel' | 'csv') => void;
  /** Callback to trigger print */
  onPrint?: () => void;
  /** Callback to trigger report generation with current filters */
  onGenerateReport?: (params: { fiscalYearId?: string; viewBy?: string; startDate?: string; endDate?: string }) => void;
  /** Show generate report button */
  showGenerateButton?: boolean;
  /** Generate button label */
  generateButtonLabel?: string;
  /** Base URL for report navigation (enables URL-based report generation) */
  reportUrl?: string;
  /** Report data for export (passed from parent) */
  reportData?: unknown;
  /** Tenant name for export header */
  tenantName?: string;
  /** Currency for formatting */
  currency?: string;
}

function normalizeExportActions(
  actions: ExportAction[] | { items?: ExportAction[] } | null | undefined
): ExportAction[] {
  if (!actions) return [];
  if (Array.isArray(actions)) return actions;
  if (actions.items && Array.isArray(actions.items)) return actions.items;
  return [];
}

export function AdminReportHeader({
  title,
  description,
  asOfDate,
  dateSelector,
  fiscalYearSelector,
  viewBySelector,
  exportActions,
  onDateChange,
  onFiscalYearChange,
  onViewByChange,
  onExport,
  onPrint,
  onGenerateReport,
  showGenerateButton = false,
  generateButtonLabel = 'Generate Report',
  reportUrl,
}: AdminReportHeaderProps) {
  const currentSearchParams = useSearchParams();
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(() => {
    if (dateSelector?.type === 'single' && dateSelector.defaultValue) {
      return new Date(dateSelector.defaultValue);
    }
    return asOfDate ? new Date(asOfDate) : new Date();
  });

  const [dateRange, setDateRange] = React.useState<{ from: Date | undefined; to: Date | undefined }>(() => {
    if (dateSelector?.type === 'range') {
      return {
        from: dateSelector.defaultStart ? new Date(dateSelector.defaultStart) : undefined,
        to: dateSelector.defaultEnd ? new Date(dateSelector.defaultEnd) : undefined,
      };
    }
    return { from: undefined, to: undefined };
  });

  // Initialize from URL params if present, otherwise use defaults
  const [selectedFiscalYear, setSelectedFiscalYear] = React.useState<string>(() => {
    const urlFiscalYear = currentSearchParams.get('fiscalYearId');
    return urlFiscalYear || fiscalYearSelector?.defaultValue || '';
  });

  const [selectedViewBy, setSelectedViewBy] = React.useState<string>(() => {
    const urlViewBy = currentSearchParams.get('viewBy');
    return urlViewBy || viewBySelector?.defaultValue || 'category';
  });

  const [isExporting, setIsExporting] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);

  const actions = normalizeExportActions(exportActions);
  const hasExportActions = actions.length > 0;
  const isRangeSelector = dateSelector?.type === 'range';

  const handleGenerateReport = async () => {
    // If reportUrl is provided, use URL navigation
    if (reportUrl) {
      // Show loading state immediately for user feedback
      setIsGenerating(true);
      toast.info('Generating report...', { duration: 2000 });

      const params = new URLSearchParams();

      if (selectedFiscalYear) {
        params.set('fiscalYearId', selectedFiscalYear);
      }
      if (selectedViewBy) {
        params.set('viewBy', selectedViewBy);
      }
      if (isRangeSelector && dateRange.from) {
        params.set('startDate', format(dateRange.from, 'yyyy-MM-dd'));
      }
      if (isRangeSelector && dateRange.to) {
        params.set('endDate', format(dateRange.to, 'yyyy-MM-dd'));
      } else if (selectedDate) {
        params.set('endDate', format(selectedDate, 'yyyy-MM-dd'));
      }

      const queryString = params.toString();
      const newUrl = queryString ? `${reportUrl}?${queryString}` : reportUrl;

      // Use window.location for full page reload to ensure fresh server render
      window.location.href = newUrl;
      return;
    }

    // Otherwise use callback
    if (!onGenerateReport) return;

    setIsGenerating(true);
    try {
      await onGenerateReport({
        fiscalYearId: selectedFiscalYear || undefined,
        viewBy: selectedViewBy || undefined,
        startDate: isRangeSelector && dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
        endDate: isRangeSelector && dateRange.to
          ? format(dateRange.to, 'yyyy-MM-dd')
          : selectedDate
          ? format(selectedDate, 'yyyy-MM-dd')
          : undefined,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFiscalYearChange = (value: string) => {
    setSelectedFiscalYear(value);
    onFiscalYearChange?.(value);
  };

  const handleViewByChange = (value: string) => {
    setSelectedViewBy(value);
    onViewByChange?.(value);
  };

  const handleSingleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date && onDateChange) {
      onDateChange(format(date, 'yyyy-MM-dd'));
    }
  };

  const handleRangeDateSelect = (range: { from: Date | undefined; to: Date | undefined }) => {
    setDateRange(range);
    if (range.from && range.to && onDateChange) {
      onDateChange(format(range.from, 'yyyy-MM-dd'), format(range.to, 'yyyy-MM-dd'));
    }
  };

  const handleExport = async (exportFormat: 'pdf' | 'excel' | 'csv') => {
    if (!onExport) {
      toast.error('Export is not configured');
      return;
    }

    setIsExporting(true);
    try {
      await onExport(exportFormat);
      toast.success(`Report exported as ${exportFormat.toUpperCase()}`);
    } catch (error) {
      console.error('[AdminReportHeader] Export failed:', error);
      toast.error(`Failed to export report as ${exportFormat.toUpperCase()}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  const formatDisplayDate = () => {
    if (isRangeSelector && dateRange.from && dateRange.to) {
      return `${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}`;
    }
    if (selectedDate) {
      return format(selectedDate, 'MMMM d, yyyy');
    }
    return asOfDate || 'Select date';
  };

  return (
    <section className="space-y-5 sm:space-y-6">
      {/* Header */}
      <header className="space-y-1.5 sm:space-y-2">
        <h2 className="text-lg sm:text-xl font-semibold text-foreground flex items-center gap-2">
          <span className="h-5 w-1 rounded-full bg-primary" />
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground pl-3">{description}</p>
        )}
      </header>

      {/* Controls Card */}
      <Card className={cn(
        "group relative overflow-hidden",
        "border-border/40 bg-card/50 backdrop-blur-sm",
        "transition-all duration-300"
      )}>
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/20" />

        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            {/* Filter Selectors */}
            <div className="flex flex-wrap items-end gap-3 sm:gap-4">
              {/* Fiscal Year Selector */}
              {fiscalYearSelector && fiscalYearSelector.options.length > 0 && (
                <div className="flex flex-col gap-1.5 min-w-[140px] sm:min-w-[160px]">
                  {fiscalYearSelector.label && (
                    <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                      {fiscalYearSelector.label}
                    </span>
                  )}
                  <Select value={selectedFiscalYear} onValueChange={handleFiscalYearChange}>
                    <SelectTrigger className="h-9 sm:h-10 border-border/60 bg-background/50 hover:border-primary/40 transition-colors">
                      <SelectValue placeholder="Select fiscal year" />
                    </SelectTrigger>
                    <SelectContent>
                      {fiscalYearSelector.options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* View By Selector */}
              {viewBySelector && viewBySelector.options.length > 0 && (
                <div className="flex flex-col gap-1.5 min-w-[120px] sm:min-w-[140px]">
                  {viewBySelector.label && (
                    <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                      {viewBySelector.label}
                    </span>
                  )}
                  <Select value={selectedViewBy} onValueChange={handleViewByChange}>
                    <SelectTrigger className="h-9 sm:h-10 border-border/60 bg-background/50 hover:border-primary/40 transition-colors">
                      <SelectValue placeholder="Select view" />
                    </SelectTrigger>
                    <SelectContent>
                      {viewBySelector.options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Date Selector */}
              {dateSelector && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                    {isRangeSelector ? 'Period' : 'As of Date'}
                  </span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'h-9 sm:h-10 min-w-[180px] sm:min-w-[220px] justify-start text-left font-normal',
                          'border-border/60 bg-background/50 hover:border-primary/40 transition-colors',
                          !selectedDate && !dateRange.from && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 truncate">{formatDisplayDate()}</span>
                        <ChevronDown className="ml-2 h-4 w-4 text-muted-foreground/60" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      {isRangeSelector ? (
                        <Calendar
                          mode="range"
                          selected={dateRange as { from: Date; to: Date }}
                          onSelect={(range) => handleRangeDateSelect({ from: range?.from, to: range?.to })}
                          numberOfMonths={2}
                          initialFocus
                        />
                      ) : (
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={handleSingleDateSelect}
                          initialFocus
                        />
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Generate Report Button */}
              {(showGenerateButton || reportUrl) && (
                <Button
                  onClick={handleGenerateReport}
                  disabled={isGenerating || (!selectedFiscalYear && !!fiscalYearSelector)}
                  className={cn(
                    "h-9 sm:h-10 px-4 sm:px-5 gap-2 font-semibold",
                    "transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98]"
                  )}
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">
                    {isGenerating ? 'Generating...' : generateButtonLabel}
                  </span>
                  <span className="sm:hidden">
                    {isGenerating ? 'Running...' : 'Run'}
                  </span>
                </Button>
              )}

              {/* Export Actions */}
              {hasExportActions && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={isExporting}
                      className="h-9 sm:h-10 px-3 sm:px-4 gap-2 border-border/60 hover:border-primary/40 transition-colors"
                    >
                      {isExporting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      <span className="hidden sm:inline">
                        {isExporting ? 'Exporting...' : 'Export'}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => handleExport('pdf')} className="gap-3">
                      <FileText className="h-4 w-4 text-rose-500" />
                      <span>Export as PDF</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('excel')} className="gap-3">
                      <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                      <span>Export as Excel</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('csv')} className="gap-3">
                      <FileBarChart className="h-4 w-4 text-sky-500" />
                      <span>Export as CSV</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <Button
                variant="ghost"
                onClick={handlePrint}
                className="h-9 sm:h-10 px-3 sm:px-4 gap-2 hover:bg-muted/50"
              >
                <Printer className="h-4 w-4" />
                <span className="hidden sm:inline">Print</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
