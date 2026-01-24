/**
 * Report Export Utilities
 *
 * Provides PDF, Excel, and CSV generation for financial reports.
 * Uses jspdf + jspdf-autotable for PDF and xlsx (SheetJS) for Excel.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ============================================================================
// Types
// ============================================================================

export interface ReportExportConfig {
  /** Organization/tenant name */
  tenantName: string;
  /** Report title (e.g., "Trial Balance") */
  title: string;
  /** Currency code (e.g., "PHP", "USD") */
  currency: string;
  /** Single date for point-in-time reports */
  asOfDate?: string;
  /** Start date for period reports */
  periodStart?: string;
  /** End date for period reports */
  periodEnd?: string;
}

export interface ReportColumn {
  /** Column key in row data */
  field: string;
  /** Display header */
  headerName: string;
  /** Column type for formatting */
  type?: 'text' | 'currency' | 'number' | 'date' | 'percentage';
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Column width (for Excel) */
  width?: number;
}

export interface ReportSection {
  /** Section title (e.g., "Income", "Expenses") */
  title?: string;
  /** Column definitions */
  columns: ReportColumn[];
  /** Data rows */
  rows: Record<string, unknown>[];
  /** Subtotal row (optional) */
  subtotal?: Record<string, unknown>;
}

export interface ReportTotals {
  /** Total label (e.g., "Grand Total") */
  label: string;
  /** Total values keyed by column field */
  values: Record<string, unknown>;
}

// ============================================================================
// PDF Export
// ============================================================================

/**
 * Generate a PDF report and trigger download
 */
export async function generatePdf(
  config: ReportExportConfig,
  sections: ReportSection[],
  totals?: ReportTotals
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let yOffset = 15;

  // Header: Organization Name
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(config.tenantName, pageWidth / 2, yOffset, { align: 'center' });
  yOffset += 8;

  // Header: Report Title
  doc.setFontSize(14);
  doc.text(config.title, pageWidth / 2, yOffset, { align: 'center' });
  yOffset += 6;

  // Header: Date Info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const dateText = config.periodStart && config.periodEnd
    ? `Period: ${config.periodStart} to ${config.periodEnd}`
    : `As of: ${config.asOfDate || new Date().toLocaleDateString()}`;
  doc.text(dateText, pageWidth / 2, yOffset, { align: 'center' });
  yOffset += 4;

  // Generation timestamp
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, yOffset, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  yOffset += 10;

  // Render each section
  for (const section of sections) {
    // Section title
    if (section.title) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(section.title, 14, yOffset);
      yOffset += 6;
    }

    // Prepare table data
    const headers = section.columns.map(col => col.headerName);
    const body = section.rows.map(row =>
      section.columns.map(col => formatCellValue(row[col.field], col.type, config.currency))
    );

    // Add subtotal row if present
    if (section.subtotal) {
      const subtotalRow = section.columns.map((col, idx) =>
        idx === 0 ? 'Subtotal' : formatCellValue(section.subtotal![col.field], col.type, config.currency)
      );
      body.push(subtotalRow);
    }

    // Render table
    autoTable(doc, {
      startY: yOffset,
      head: [headers],
      body,
      styles: {
        fontSize: 9,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [66, 66, 66],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: buildColumnStyles(section.columns),
      didDrawPage: (data) => {
        // Add page numbers
        const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
        doc.setTextColor(0, 0, 0);
      },
    });

    // Update yOffset after table
    yOffset = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  // Grand totals
  if (totals && sections.length > 0) {
    const totalColumns = sections[0].columns;
    const totalRow = totalColumns.map((col, idx) =>
      idx === 0 ? totals.label : formatCellValue(totals.values[col.field], col.type, config.currency)
    );

    autoTable(doc, {
      startY: yOffset,
      body: [totalRow],
      styles: {
        fontSize: 10,
        cellPadding: 3,
        fontStyle: 'bold',
      },
      columnStyles: buildColumnStyles(totalColumns),
      theme: 'plain',
      tableLineColor: [66, 66, 66],
      tableLineWidth: 0.5,
    });
  }

  // Generate filename and download
  const filename = generateFilename(config.title, 'pdf');
  doc.save(filename);
}

// ============================================================================
// Excel Export
// ============================================================================

/**
 * Generate an Excel workbook and trigger download
 */
export async function generateExcel(
  config: ReportExportConfig,
  sections: ReportSection[],
  totals?: ReportTotals
): Promise<void> {
  const workbook = XLSX.utils.book_new();
  const sheetData: (string | number | null)[][] = [];

  // Header rows
  sheetData.push([config.tenantName]);
  sheetData.push([config.title]);

  const dateText = config.periodStart && config.periodEnd
    ? `Period: ${config.periodStart} to ${config.periodEnd}`
    : `As of: ${config.asOfDate || new Date().toLocaleDateString()}`;
  sheetData.push([dateText]);
  sheetData.push([`Generated: ${new Date().toLocaleString()}`]);
  sheetData.push([]); // Empty row

  // Render each section
  for (const section of sections) {
    // Section title
    if (section.title) {
      sheetData.push([section.title]);
    }

    // Column headers
    sheetData.push(section.columns.map(col => col.headerName));

    // Data rows - use raw values for Excel (no formatting)
    for (const row of section.rows) {
      sheetData.push(section.columns.map(col => {
        const value = row[col.field];
        if (value === null || value === undefined) return null;
        if (typeof value === 'number') return value;
        return String(value);
      }));
    }

    // Subtotal row
    if (section.subtotal) {
      const subtotalRow = section.columns.map((col, idx) => {
        if (idx === 0) return 'Subtotal';
        const value = section.subtotal![col.field];
        if (value === null || value === undefined) return null;
        if (typeof value === 'number') return value;
        return String(value);
      });
      sheetData.push(subtotalRow);
    }

    sheetData.push([]); // Empty row between sections
  }

  // Grand totals
  if (totals && sections.length > 0) {
    const totalColumns = sections[0].columns;
    const totalRow = totalColumns.map((col, idx) => {
      if (idx === 0) return totals.label;
      const value = totals.values[col.field];
      if (value === null || value === undefined) return null;
      if (typeof value === 'number') return value;
      return String(value);
    });
    sheetData.push(totalRow);
  }

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  // Set column widths
  if (sections.length > 0) {
    const colWidths = sections[0].columns.map(col => ({
      wch: col.width || (col.type === 'currency' ? 15 : 20),
    }));
    worksheet['!cols'] = colWidths;
  }

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');

  // Generate filename and download
  const filename = generateFilename(config.title, 'xlsx');
  XLSX.writeFile(workbook, filename);
}

// ============================================================================
// CSV Export
// ============================================================================

/**
 * Generate a CSV file and trigger download
 */
export async function generateCsv(
  config: ReportExportConfig,
  sections: ReportSection[],
  totals?: ReportTotals
): Promise<void> {
  const lines: string[] = [];

  // Header info
  lines.push(escapeCSV(config.tenantName));
  lines.push(escapeCSV(config.title));

  const dateText = config.periodStart && config.periodEnd
    ? `Period: ${config.periodStart} to ${config.periodEnd}`
    : `As of: ${config.asOfDate || new Date().toLocaleDateString()}`;
  lines.push(escapeCSV(dateText));
  lines.push('');

  // Render each section
  for (const section of sections) {
    if (section.title) {
      lines.push(escapeCSV(section.title));
    }

    // Column headers
    lines.push(section.columns.map(col => escapeCSV(col.headerName)).join(','));

    // Data rows
    for (const row of section.rows) {
      const rowValues = section.columns.map(col => {
        const value = row[col.field];
        if (value === null || value === undefined) return '';
        return escapeCSV(String(value));
      });
      lines.push(rowValues.join(','));
    }

    // Subtotal
    if (section.subtotal) {
      const subtotalValues = section.columns.map((col, idx) => {
        if (idx === 0) return 'Subtotal';
        const value = section.subtotal![col.field];
        if (value === null || value === undefined) return '';
        return escapeCSV(String(value));
      });
      lines.push(subtotalValues.join(','));
    }

    lines.push('');
  }

  // Grand totals
  if (totals && sections.length > 0) {
    const totalColumns = sections[0].columns;
    const totalValues = totalColumns.map((col, idx) => {
      if (idx === 0) return escapeCSV(totals.label);
      const value = totals.values[col.field];
      if (value === null || value === undefined) return '';
      return escapeCSV(String(value));
    });
    lines.push(totalValues.join(','));
  }

  // Create and download file
  const csvContent = lines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const filename = generateFilename(config.title, 'csv');
  downloadBlob(blob, filename);
}

// ============================================================================
// Print Support
// ============================================================================

/**
 * Print the report using the browser's print dialog
 * @param elementRef - Reference to the DOM element to print
 */
export function printReport(elementRef?: React.RefObject<HTMLElement>): void {
  if (elementRef?.current) {
    // Print specific element
    const content = elementRef.current.innerHTML;
    const printWindow = window.open('', '_blank', 'width=800,height=600');

    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Financial Report</title>
            <style>
              * { box-sizing: border-box; }
              body {
                font-family: system-ui, -apple-system, sans-serif;
                padding: 20px;
                margin: 0;
                color: #1a1a1a;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 16px 0;
              }
              th, td {
                padding: 8px 12px;
                border-bottom: 1px solid #e5e5e5;
                text-align: left;
              }
              th {
                background: #f5f5f5;
                font-weight: 600;
                border-bottom: 2px solid #d4d4d4;
              }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .font-bold { font-weight: 600; }
              .total-row {
                font-weight: 600;
                background: #fafafa;
                border-top: 2px solid #d4d4d4;
              }
              .section-title {
                font-size: 14px;
                font-weight: 600;
                margin: 24px 0 8px;
                color: #404040;
              }
              @media print {
                body { padding: 0; }
                @page { margin: 1cm; }
              }
            </style>
          </head>
          <body>${content}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();

      // Wait for content to load then print
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  } else {
    // Print current page
    window.print();
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatCellValue(
  value: unknown,
  type?: string,
  currency?: string
): string {
  if (value === null || value === undefined) {
    return '—';
  }

  switch (type) {
    case 'currency': {
      const amount = Number(value);
      if (Number.isNaN(amount)) return String(value);
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'PHP',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    }
    case 'number': {
      const num = Number(value);
      if (Number.isNaN(num)) return String(value);
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(num);
    }
    case 'percentage': {
      const pct = Number(value);
      if (Number.isNaN(pct)) return String(value);
      return `${pct.toFixed(1)}%`;
    }
    case 'date': {
      const date = new Date(String(value));
      if (Number.isNaN(date.getTime())) return String(value);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
    default:
      return String(value);
  }
}

function buildColumnStyles(columns: ReportColumn[]): Record<number, { halign: 'left' | 'center' | 'right' }> {
  const styles: Record<number, { halign: 'left' | 'center' | 'right' }> = {};

  columns.forEach((col, idx) => {
    let align: 'left' | 'center' | 'right' = 'left';

    if (col.align) {
      align = col.align;
    } else if (col.type === 'currency' || col.type === 'number' || col.type === 'percentage') {
      align = 'right';
    }

    styles[idx] = { halign: align };
  });

  return styles;
}

function generateFilename(title: string, extension: string): string {
  const sanitized = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const timestamp = new Date().toISOString().slice(0, 10);
  return `${sanitized}-${timestamp}.${extension}`;
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
