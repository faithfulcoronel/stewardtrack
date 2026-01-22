/**
 * PDF & Report Export Utilities
 *
 * This module provides comprehensive PDF generation for financial reports.
 *
 * Two approaches are available:
 *
 * 1. **pdf-lib based** (reportPdf, churchFinancialStatementPdf, etc.)
 *    - Uses pdf-lib library for low-level PDF construction
 *    - Better for custom layouts and precise control
 *    - Used by existing financial statement reports
 *
 * 2. **jspdf based** (reportExports)
 *    - Uses jspdf + jspdf-autotable for table-based reports
 *    - Also provides Excel (xlsx) and CSV exports
 *    - Better for quick tabular report generation
 */

// pdf-lib based PDF generators
export { exportReportPdf, type PdfOptions, type PdfColumn } from './reportPdf';

export {
  generateChurchFinancialStatementPdf,
  type ChurchFinancialStatementData,
  type FinancialSummaryRecord,
  type FundBalanceRecord,
  type CategoryRecord,
  type AccountCategorySummary,
  type MemberGivingSummaryRecord,
} from './churchFinancialStatementPdf';

export {
  generateMemberGivingSummaryPdf,
  type MemberGivingRecord,
} from './memberGivingSummaryPdf';

export {
  generateMemberOfferingSummaryPdf,
  type MemberOfferingRecord,
} from './memberOfferingSummaryPdf';

export {
  generateExpenseSummaryPdf,
  type ExpenseSummaryRecord,
} from './expenseSummaryPdf';

// jspdf based report exports (PDF, Excel, CSV)
export {
  generatePdf,
  generateExcel,
  generateCsv,
  printReport,
  type ReportExportConfig,
  type ReportColumn,
  type ReportSection,
  type ReportTotals,
} from './reportExports';
