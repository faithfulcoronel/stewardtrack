'use client';

import React from 'react';
import { FileSpreadsheet, Scale, TrendingUp, TrendingDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

export interface ReportColumn {
  field: string;
  headerName?: string | null;
  type?: 'text' | 'currency' | 'number' | 'percentage' | null;
  align?: 'left' | 'center' | 'right' | null;
  width?: number | null;
  hideOnMobile?: boolean | null;
}

export interface ReportSubtotal {
  label: string;
  type?: string;
  debit?: string | number;
  credit?: string | number;
  amount?: string | number;
}

export interface ReportGrandTotal {
  debit?: string | number;
  credit?: string | number;
  balanced?: boolean;
  label?: string;
  // For period-based reports
  periods?: { period_id: string; period_name: string; debit: number; credit: number }[];
  total_debit?: number;
  total_credit?: number;
}

export interface PeriodColumnConfig {
  id: string;
  name: string;
}

export interface EmptyStateConfig {
  title?: string;
  description?: string;
}

export interface AdminReportTableProps {
  /** Section title */
  title?: string;
  /** Report data rows */
  rows?: Record<string, unknown>[] | null;
  /** Column definitions */
  columns?: ReportColumn[] | { items?: ReportColumn[] } | null;
  /** Period columns for period-based reports */
  periodColumns?: PeriodColumnConfig[] | { items?: PeriodColumnConfig[] } | null;
  /** Subtotals by category/type */
  subtotals?: ReportSubtotal[] | { items?: ReportSubtotal[] } | null;
  /** Grand total row */
  grandTotal?: ReportGrandTotal | null;
  /** Empty state configuration */
  emptyState?: EmptyStateConfig | string | null;
  /** Currency code for formatting */
  currency?: string;
  /** Reference for print functionality */
  printRef?: React.RefObject<HTMLDivElement>;
}

function normalizeList<T>(input: T[] | { items?: T[] } | null | undefined): T[] {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  if (input.items && Array.isArray(input.items)) return input.items;
  return [];
}

function parseEmptyState(config: EmptyStateConfig | string | null | undefined): EmptyStateConfig {
  if (!config) {
    return { title: 'No data available', description: 'No records found for the selected criteria.' };
  }
  if (typeof config === 'string') {
    try {
      return JSON.parse(config) as EmptyStateConfig;
    } catch {
      return { title: config, description: '' };
    }
  }
  return config;
}

export function AdminReportTable({
  title,
  rows,
  columns,
  periodColumns,
  subtotals,
  grandTotal,
  emptyState,
  currency = 'USD',
  printRef,
}: AdminReportTableProps) {
  const tableRef = React.useRef<HTMLDivElement>(null);
  const columnList = normalizeList<ReportColumn>(columns);
  const periodColumnList = normalizeList<PeriodColumnConfig>(periodColumns);
  const rowList = rows ?? [];
  const subtotalList = normalizeList<ReportSubtotal>(subtotals);
  const emptyConfig = parseEmptyState(emptyState);
  const hasPeriodColumns = periodColumnList.length > 0;

  // Expose ref globally for print functionality
  React.useEffect(() => {
    // Use a local mutable ref to avoid React immutability issues
    const mutablePrintRef = printRef as React.MutableRefObject<HTMLDivElement | null> | undefined;
    if (mutablePrintRef && tableRef.current) {
      mutablePrintRef.current = tableRef.current;
    }
    // Also set on window for easy access
    (window as unknown as { __reportTableRef?: HTMLDivElement | null }).__reportTableRef = tableRef.current;
  }, [printRef]);

  const formatValue = (value: unknown, type?: string | null): string => {
    if (value === null || value === undefined) {
      return '—';
    }

    switch (type) {
      case 'currency': {
        const amount = typeof value === 'string' ? parseFloat(value) : Number(value);
        if (Number.isNaN(amount)) return String(value);
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(amount);
      }
      case 'number': {
        const num = typeof value === 'string' ? parseFloat(value) : Number(value);
        if (Number.isNaN(num)) return String(value);
        return new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(num);
      }
      case 'percentage': {
        const pct = typeof value === 'string' ? parseFloat(value) : Number(value);
        if (Number.isNaN(pct)) return String(value);
        return `${pct.toFixed(1)}%`;
      }
      default:
        return String(value);
    }
  };

  const getAlignment = (column: ReportColumn): string => {
    if (column.align) {
      return column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left';
    }
    // Default alignment based on type
    if (column.type === 'currency' || column.type === 'number' || column.type === 'percentage') {
      return 'text-right';
    }
    return 'text-left';
  };

  // Helper to get period value from row's periods array
  const getPeriodValue = (
    row: Record<string, unknown>,
    periodId: string,
    field: 'debit' | 'credit' | 'net'
  ): number => {
    const periods = row.periods as Array<{ period_id: string; debit: number; credit: number }> | undefined;
    if (!periods) return 0;
    const period = periods.find(p => p.period_id === periodId);
    if (!period) return 0;
    if (field === 'net') return (period.credit || 0) - (period.debit || 0);
    return period[field] || 0;
  };

  // Helper to format period value as currency with parentheses for negative values
  const formatPeriodValue = (value: number): string => {
    if (value === 0) return '—';
    const absValue = Math.abs(value);
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(absValue);
    // Use parentheses for negative values (accounting convention)
    return value < 0 ? `(${formatted})` : formatted;
  };

  if (rowList.length === 0) {
    return (
      <section className="space-y-5 sm:space-y-6">
        {title && (
          <header className="space-y-1.5 sm:space-y-2">
            <h3 className="text-lg sm:text-xl font-semibold text-foreground flex items-center gap-2">
              <span className="h-5 w-1 rounded-full bg-primary" />
              {title}
            </h3>
          </header>
        )}
        <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-8 sm:p-12 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40 shadow-inner">
              <FileSpreadsheet className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground/60" aria-hidden />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground">
                {emptyConfig.title || 'No data available'}
              </h3>
              {emptyConfig.description && (
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  {emptyConfig.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={tableRef} className="space-y-5 sm:space-y-6">
      {title && (
        <header className="space-y-1.5 sm:space-y-2">
          <h3 className="text-lg sm:text-xl font-semibold text-foreground flex items-center gap-2">
            <span className="h-5 w-1 rounded-full bg-primary" />
            {title}
          </h3>
        </header>
      )}

      <Card className={cn(
        "group relative overflow-hidden",
        "border-border/40 bg-card/50 backdrop-blur-sm"
      )}>
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/20" />

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
          {/* Header */}
          <thead>
            <tr className="border-b border-border/50 bg-muted/40">
              {columnList.map((col, idx) => (
                <th
                  key={col.field || idx}
                  className={cn(
                    'px-3 sm:px-4 py-3 sm:py-3.5 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground/80',
                    getAlignment(col),
                    col.hideOnMobile && 'hidden md:table-cell'
                  )}
                  style={col.width ? { width: `${col.width}px` } : undefined}
                >
                  {col.headerName || col.field}
                </th>
              ))}
              {/* Period Columns */}
              {hasPeriodColumns && periodColumnList.map((period) => (
                <th
                  key={period.id}
                  className="px-3 sm:px-4 py-3 sm:py-3.5 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 text-right"
                >
                  {period.name}
                </th>
              ))}
              {/* Total Column when period columns exist */}
              {hasPeriodColumns && (
                <th className="px-3 sm:px-4 py-3 sm:py-3.5 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 text-right">
                  Total
                </th>
              )}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-border/30">
            {rowList.map((row, rowIdx) => (
              <tr
                key={String(row.id || row.account_id || rowIdx)}
                className="hover:bg-muted/40 transition-colors duration-150"
                style={{ animationDelay: `${rowIdx * 20}ms` }}
              >
                {columnList.map((col, colIdx) => (
                  <td
                    key={col.field || colIdx}
                    className={cn(
                      'px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm',
                      getAlignment(col),
                      col.hideOnMobile && 'hidden md:table-cell',
                      colIdx === 0 && 'font-medium text-foreground'
                    )}
                  >
                    {formatValue(row[col.field], col.type)}
                  </td>
                ))}
                {/* Period Column Values */}
                {hasPeriodColumns && periodColumnList.map((period) => {
                  const netValue = getPeriodValue(row, period.id, 'net');
                  return (
                    <td
                      key={`period-${period.id}`}
                      className={cn(
                        'px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-right tabular-nums',
                        netValue < 0 && 'text-rose-600 dark:text-rose-400'
                      )}
                    >
                      {formatPeriodValue(netValue)}
                    </td>
                  );
                })}
                {/* Total Column when period columns exist */}
                {hasPeriodColumns && (() => {
                  const rowTotal = Number(row.total_credit || 0) - Number(row.total_debit || 0);
                  return (
                    <td className={cn(
                      'px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-right font-medium tabular-nums',
                      rowTotal < 0 && 'text-rose-600 dark:text-rose-400'
                    )}>
                      {formatPeriodValue(rowTotal)}
                    </td>
                  );
                })()}
              </tr>
            ))}

            {/* Subtotals */}
            {subtotalList.map((subtotal, idx) => {
              const subtotalPeriods = (subtotal as unknown as { periods?: Array<{ period_id: string; debit: number; credit: number }> }).periods;
              const subtotalTotalDebit = (subtotal as unknown as { total_debit?: number }).total_debit;
              const subtotalTotalCredit = (subtotal as unknown as { total_credit?: number }).total_credit;

              return (
                <tr
                  key={`subtotal-${subtotal.type || idx}`}
                  className="bg-primary/5 border-t border-primary/20"
                >
                  {columnList.map((col, colIdx) => {
                    if (colIdx === 0) {
                      return (
                        <td
                          key={col.field || colIdx}
                          className={cn(
                            'px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-primary',
                            getAlignment(col)
                          )}
                        >
                          {subtotal.label}
                        </td>
                      );
                    }
                    // Match subtotal values to columns
                    let value: unknown = null;
                    if (col.field === 'debit_balance' || col.field === 'debit') {
                      value = subtotal.debit;
                    } else if (col.field === 'credit_balance' || col.field === 'credit') {
                      value = subtotal.credit;
                    } else if (col.field === 'amount' || col.field === 'balance') {
                      value = subtotal.amount;
                    }

                    return (
                      <td
                        key={col.field || colIdx}
                        className={cn(
                          'px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold tabular-nums',
                          getAlignment(col),
                          col.hideOnMobile && 'hidden md:table-cell'
                        )}
                      >
                        {formatValue(value, col.type)}
                      </td>
                    );
                  })}
                  {/* Period Column Values for Subtotals */}
                  {hasPeriodColumns && periodColumnList.map((period) => {
                    const periodData = subtotalPeriods?.find(p => p.period_id === period.id);
                    const netValue = periodData ? (periodData.credit || 0) - (periodData.debit || 0) : 0;
                    return (
                      <td
                        key={`subtotal-period-${period.id}`}
                        className={cn(
                          'px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-right font-semibold tabular-nums',
                          netValue < 0 && 'text-rose-600 dark:text-rose-400'
                        )}
                      >
                        {formatPeriodValue(netValue)}
                      </td>
                    );
                  })}
                  {/* Total Column for Subtotals */}
                  {hasPeriodColumns && (() => {
                    const subtotalTotal = (subtotalTotalCredit || 0) - (subtotalTotalDebit || 0);
                    return (
                      <td className={cn(
                        'px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-right font-semibold tabular-nums',
                        subtotalTotal < 0 && 'text-rose-600 dark:text-rose-400'
                      )}>
                        {formatPeriodValue(subtotalTotal)}
                      </td>
                    );
                  })()}
                </tr>
              );
            })}
          </tbody>

          {/* Grand Total Footer */}
          {grandTotal && (
            <tfoot>
              <tr className="border-t-2 border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5 font-bold">
                {columnList.map((col, colIdx) => {
                  if (colIdx === 0) {
                    return (
                      <td
                        key={col.field || colIdx}
                        className={cn(
                          'px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm text-primary',
                          getAlignment(col)
                        )}
                      >
                        {grandTotal.label || 'Grand Total'}
                      </td>
                    );
                  }

                  // Match grand total values to columns
                  let value: unknown = null;
                  if (col.field === 'debit_balance' || col.field === 'debit') {
                    value = grandTotal.debit;
                  } else if (col.field === 'credit_balance' || col.field === 'credit') {
                    value = grandTotal.credit;
                  }

                  return (
                    <td
                      key={col.field || colIdx}
                      className={cn(
                        'px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm tabular-nums',
                        getAlignment(col),
                        col.hideOnMobile && 'hidden md:table-cell'
                      )}
                    >
                      {formatValue(value, col.type)}
                    </td>
                  );
                })}
                {/* Period Column Values for Grand Total */}
                {hasPeriodColumns && periodColumnList.map((period) => {
                  const periodData = grandTotal.periods?.find(p => p.period_id === period.id);
                  const netValue = periodData ? (periodData.credit || 0) - (periodData.debit || 0) : 0;
                  return (
                    <td
                      key={`grand-period-${period.id}`}
                      className={cn(
                        'px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm text-right tabular-nums',
                        netValue < 0 && 'text-rose-600 dark:text-rose-400'
                      )}
                    >
                      {formatPeriodValue(netValue)}
                    </td>
                  );
                })}
                {/* Total Column for Grand Total */}
                {hasPeriodColumns && (() => {
                  const grandTotalValue = (grandTotal.total_credit || 0) - (grandTotal.total_debit || 0);
                  return (
                    <td className={cn(
                      'px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm text-right tabular-nums',
                      grandTotalValue < 0 && 'text-rose-600 dark:text-rose-400'
                    )}>
                      {formatPeriodValue(grandTotalValue)}
                    </td>
                  );
                })()}
              </tr>

              {/* Balance Status Row */}
              {grandTotal.balanced !== undefined && (
                <tr className="border-t border-border/40 bg-muted/20">
                  <td colSpan={columnList.length + (hasPeriodColumns ? periodColumnList.length + 1 : 0)} className="px-3 sm:px-4 py-3 sm:py-4">
                    <div className="flex items-center justify-end gap-2 sm:gap-3">
                      {(() => {
                        // Calculate net balance for income/expense reports
                        // Income (credit) - Expenses (debit) = Net
                        const netBalance = (grandTotal.total_credit || Number(grandTotal.credit) || 0)
                          - (grandTotal.total_debit || Number(grandTotal.debit) || 0);

                        // Format the net amount for display
                        const formattedAmount = new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency,
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }).format(Math.abs(netBalance));

                        if (Math.abs(netBalance) < 0.01) {
                          return (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/60">
                              <Scale className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                              <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                                Break-even
                              </span>
                            </div>
                          );
                        } else if (netBalance > 0) {
                          return (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                Surplus: {formattedAmount}
                              </span>
                            </div>
                          );
                        } else {
                          return (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30">
                              <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-rose-600 dark:text-rose-400" />
                              <span className="text-xs sm:text-sm font-semibold text-rose-600 dark:text-rose-400">
                                Deficit: {formattedAmount}
                              </span>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  </td>
                </tr>
              )}
            </tfoot>
          )}
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
