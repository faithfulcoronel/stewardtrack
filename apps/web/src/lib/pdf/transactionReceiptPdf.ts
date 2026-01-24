import { PDFDocument, PDFPage, PDFFont, StandardFonts, rgb } from 'pdf-lib';
import { format } from 'date-fns';

export interface TransactionLineItem {
  account: string;
  category: string;
  fund: string;
  source: string;
  amount: number;
  description: string;
}

export interface TransactionPdfData {
  transactionNumber: string;
  transactionDate: Date;
  transactionType: 'income' | 'expense';
  status: string;
  description: string;
  lineItems: TransactionLineItem[];
  totalAmount: number;
  tenantName: string;
  tenantAddress?: string;
  currency: string;
}

const formatAmount = (amount: number, currency: string) => {
  // Use text representations for currency symbols that aren't supported by WinAnsi encoding
  // Standard PDF fonts (Helvetica) don't support special characters like ₱
  const currencySymbol = currency === 'PHP' ? 'PHP ' : currency === 'PHP' ? '$' : `${currency} `;
  return `${currencySymbol}${amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// Page dimensions and layout constants
const PAGE_WIDTH = 595; // A4 width in points
const PAGE_HEIGHT = 842; // A4 height in points
const MARGIN = 50;
const ROW_HEIGHT = 18;
const FOOTER_HEIGHT = 80; // Space reserved for footer
const BOTTOM_MARGIN = MARGIN + FOOTER_HEIGHT;

const COL_WIDTHS = {
  account: 100,
  category: 90,
  fund: 80,
  source: 80,
  description: 90,
  amount: 70,
};

interface PdfContext {
  pdfDoc: PDFDocument;
  font: PDFFont;
  boldFont: PDFFont;
  data: TransactionPdfData;
  currentPage: PDFPage;
  y: number;
  pageNumber: number;
  totalPages: number;
}

// Helper to draw text on current page
function drawText(
  ctx: PdfContext,
  text: string,
  x: number,
  yPos: number,
  options: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb> } = {}
) {
  ctx.currentPage.drawText(text, {
    x,
    y: yPos,
    font: options.font || ctx.font,
    size: options.size || 10,
    color: options.color || rgb(0, 0, 0),
  });
}

// Truncate text if too long
function truncate(text: string, maxWidth: number, font: PDFFont, size: number): string {
  let t = text || '—';
  while (font.widthOfTextAtSize(t, size) > maxWidth - 10 && t.length > 3) {
    t = t.substring(0, t.length - 4) + '...';
  }
  return t;
}

// Draw the table header
function drawTableHeader(ctx: PdfContext): void {
  const tableLeft = MARGIN;

  // Table Header Background
  ctx.currentPage.drawRectangle({
    x: tableLeft,
    y: ctx.y - ROW_HEIGHT + 4,
    width: PAGE_WIDTH - 2 * MARGIN,
    height: ROW_HEIGHT,
    color: rgb(0.9, 0.9, 0.9),
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 0.5,
  });

  // Table Header Text
  let headerX = tableLeft + 5;
  drawText(ctx, 'Account', headerX, ctx.y - 8, { font: ctx.boldFont, size: 9 });
  headerX += COL_WIDTHS.account;
  drawText(ctx, 'Category', headerX, ctx.y - 8, { font: ctx.boldFont, size: 9 });
  headerX += COL_WIDTHS.category;
  drawText(ctx, 'Fund', headerX, ctx.y - 8, { font: ctx.boldFont, size: 9 });
  headerX += COL_WIDTHS.fund;
  drawText(ctx, 'Source', headerX, ctx.y - 8, { font: ctx.boldFont, size: 9 });
  headerX += COL_WIDTHS.source;
  drawText(ctx, 'Description', headerX, ctx.y - 8, { font: ctx.boldFont, size: 9 });
  headerX += COL_WIDTHS.description;
  drawText(ctx, 'Amount', headerX, ctx.y - 8, { font: ctx.boldFont, size: 9 });

  ctx.y -= ROW_HEIGHT;
}

// Draw a single line item row
function drawLineItemRow(ctx: PdfContext, item: TransactionLineItem, index: number): void {
  const tableLeft = MARGIN;
  const fillColor = index % 2 === 0 ? rgb(1, 1, 1) : rgb(0.97, 0.97, 0.97);

  ctx.currentPage.drawRectangle({
    x: tableLeft,
    y: ctx.y - ROW_HEIGHT + 4,
    width: PAGE_WIDTH - 2 * MARGIN,
    height: ROW_HEIGHT,
    color: fillColor,
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 0.5,
  });

  let cellX = tableLeft + 5;

  drawText(ctx, truncate(item.account, COL_WIDTHS.account, ctx.font, 9), cellX, ctx.y - 8, { size: 9 });
  cellX += COL_WIDTHS.account;
  drawText(ctx, truncate(item.category, COL_WIDTHS.category, ctx.font, 9), cellX, ctx.y - 8, { size: 9 });
  cellX += COL_WIDTHS.category;
  drawText(ctx, truncate(item.fund, COL_WIDTHS.fund, ctx.font, 9), cellX, ctx.y - 8, { size: 9 });
  cellX += COL_WIDTHS.fund;
  drawText(ctx, truncate(item.source, COL_WIDTHS.source, ctx.font, 9), cellX, ctx.y - 8, { size: 9 });
  cellX += COL_WIDTHS.source;
  drawText(ctx, truncate(item.description, COL_WIDTHS.description, ctx.font, 9), cellX, ctx.y - 8, { size: 9 });

  // Right-align amount
  const amountText = formatAmount(item.amount, ctx.data.currency);
  const amountWidth = ctx.font.widthOfTextAtSize(amountText, 9);
  drawText(ctx, amountText, tableLeft + (PAGE_WIDTH - 2 * MARGIN) - amountWidth - 5, ctx.y - 8, { size: 9 });

  ctx.y -= ROW_HEIGHT;
}

// Draw the total row
function drawTotalRow(ctx: PdfContext): void {
  const tableLeft = MARGIN;

  ctx.y -= 5;
  ctx.currentPage.drawRectangle({
    x: tableLeft,
    y: ctx.y - ROW_HEIGHT + 4,
    width: PAGE_WIDTH - 2 * MARGIN,
    height: ROW_HEIGHT,
    color: rgb(0.85, 0.85, 0.85),
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 0.5,
  });

  drawText(ctx, 'TOTAL', tableLeft + 5, ctx.y - 8, { font: ctx.boldFont, size: 10 });

  const totalText = formatAmount(ctx.data.totalAmount, ctx.data.currency);
  const totalWidth = ctx.boldFont.widthOfTextAtSize(totalText, 10);
  drawText(ctx, totalText, tableLeft + (PAGE_WIDTH - 2 * MARGIN) - totalWidth - 5, ctx.y - 8, { font: ctx.boldFont, size: 10 });

  ctx.y -= ROW_HEIGHT;
}

// Draw page header (organization name, address, document title)
function drawPageHeader(ctx: PdfContext, isFirstPage: boolean): void {
  ctx.y = PAGE_HEIGHT - MARGIN;

  // Header - Church/Organization Name
  const titleText = ctx.data.tenantName;
  const titleWidth = ctx.boldFont.widthOfTextAtSize(titleText, 18);
  drawText(ctx, titleText, PAGE_WIDTH / 2 - titleWidth / 2, ctx.y, { font: ctx.boldFont, size: 18 });
  ctx.y -= 20;

  // Address if provided
  if (ctx.data.tenantAddress) {
    const addressWidth = ctx.font.widthOfTextAtSize(ctx.data.tenantAddress, 10);
    drawText(ctx, ctx.data.tenantAddress, PAGE_WIDTH / 2 - addressWidth / 2, ctx.y, { size: 10 });
    ctx.y -= 15;
  }

  // Document Title
  ctx.y -= 10;
  const docTitle = ctx.data.transactionType === 'income' ? 'INCOME RECEIPT' : 'EXPENSE VOUCHER';
  const pageIndicator = ctx.totalPages > 1 ? ` (Page ${ctx.pageNumber} of ${ctx.totalPages})` : '';
  const fullTitle = docTitle + pageIndicator;
  const docTitleWidth = ctx.boldFont.widthOfTextAtSize(fullTitle, 14);
  drawText(ctx, fullTitle, PAGE_WIDTH / 2 - docTitleWidth / 2, ctx.y, { font: ctx.boldFont, size: 14 });
  ctx.y -= 25;

  // Horizontal line
  ctx.currentPage.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: PAGE_WIDTH - MARGIN, y: ctx.y },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7),
  });
  ctx.y -= 20;

  // Transaction Info Section (only on first page)
  if (isFirstPage) {
    const leftCol = MARGIN;
    const rightCol = PAGE_WIDTH / 2 + 20;
    const labelWidth = 100;

    // Left column - Transaction Number and Date
    drawText(ctx, 'Transaction #:', leftCol, ctx.y, { font: ctx.boldFont, size: 10 });
    drawText(ctx, ctx.data.transactionNumber, leftCol + labelWidth, ctx.y, { size: 10 });

    // Right column - Status
    drawText(ctx, 'Status:', rightCol, ctx.y, { font: ctx.boldFont, size: 10 });
    drawText(ctx, ctx.data.status.charAt(0).toUpperCase() + ctx.data.status.slice(1), rightCol + 60, ctx.y, { size: 10 });
    ctx.y -= 15;

    // Date and Type
    drawText(ctx, 'Date:', leftCol, ctx.y, { font: ctx.boldFont, size: 10 });
    drawText(ctx, format(ctx.data.transactionDate, 'MMMM d, yyyy'), leftCol + labelWidth, ctx.y, { size: 10 });

    drawText(ctx, 'Type:', rightCol, ctx.y, { font: ctx.boldFont, size: 10 });
    drawText(ctx, ctx.data.transactionType.charAt(0).toUpperCase() + ctx.data.transactionType.slice(1), rightCol + 60, ctx.y, { size: 10 });
    ctx.y -= 15;

    // Description
    if (ctx.data.description) {
      drawText(ctx, 'Description:', leftCol, ctx.y, { font: ctx.boldFont, size: 10 });
      drawText(ctx, ctx.data.description, leftCol + labelWidth, ctx.y, { size: 10 });
      ctx.y -= 15;
    }

    ctx.y -= 15;
  }
}

// Draw footer with signature lines and timestamp
function drawFooter(ctx: PdfContext): void {
  const footerY = MARGIN + 30;
  const sigLineWidth = 150;
  const sigLineY = footerY + 30;

  // Prepared by
  ctx.currentPage.drawLine({
    start: { x: MARGIN, y: sigLineY },
    end: { x: MARGIN + sigLineWidth, y: sigLineY },
    thickness: 0.5,
    color: rgb(0, 0, 0),
  });
  const prepText = 'Prepared by';
  drawText(ctx, prepText, MARGIN + sigLineWidth / 2 - ctx.font.widthOfTextAtSize(prepText, 8) / 2, sigLineY - 12, { size: 8 });

  // Approved by
  ctx.currentPage.drawLine({
    start: { x: PAGE_WIDTH - MARGIN - sigLineWidth, y: sigLineY },
    end: { x: PAGE_WIDTH - MARGIN, y: sigLineY },
    thickness: 0.5,
    color: rgb(0, 0, 0),
  });
  const appText = 'Approved by';
  drawText(ctx, appText, PAGE_WIDTH - MARGIN - sigLineWidth / 2 - ctx.font.widthOfTextAtSize(appText, 8) / 2, sigLineY - 12, { size: 8 });

  // Generated timestamp
  const genText = `Generated via StewardTrack on ${format(new Date(), 'MMMM d, yyyy h:mm a')}`;
  const genWidth = ctx.font.widthOfTextAtSize(genText, 8);
  drawText(ctx, genText, PAGE_WIDTH / 2 - genWidth / 2, MARGIN, { size: 8, color: rgb(0.5, 0.5, 0.5) });
}

// Create a new page and initialize it
function createNewPage(ctx: PdfContext, isFirstPage: boolean): void {
  ctx.currentPage = ctx.pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  ctx.pageNumber++;
  drawPageHeader(ctx, isFirstPage);
  drawTableHeader(ctx);
}

// Check if we need a new page (if y position is too low)
function needsNewPage(ctx: PdfContext, additionalHeight: number = ROW_HEIGHT): boolean {
  return ctx.y - additionalHeight < BOTTOM_MARGIN;
}

// Calculate total pages needed
function calculateTotalPages(data: TransactionPdfData): number {
  // Calculate approximate space for header on first page
  const firstPageHeaderHeight = 20 + (data.tenantAddress ? 15 : 0) + 10 + 25 + 20 + 15 + 15 + (data.description ? 15 : 0) + 15;
  const continuationPageHeaderHeight = 20 + (data.tenantAddress ? 15 : 0) + 10 + 25 + 20;

  const tableHeaderHeight = ROW_HEIGHT;
  const totalRowHeight = ROW_HEIGHT + 5;

  const firstPageAvailable = PAGE_HEIGHT - MARGIN - firstPageHeaderHeight - tableHeaderHeight - BOTTOM_MARGIN;
  const continuationPageAvailable = PAGE_HEIGHT - MARGIN - continuationPageHeaderHeight - tableHeaderHeight - BOTTOM_MARGIN;

  const itemsPerFirstPage = Math.floor(firstPageAvailable / ROW_HEIGHT);
  const itemsPerContinuationPage = Math.floor(continuationPageAvailable / ROW_HEIGHT);

  const totalItems = data.lineItems.length;

  if (totalItems <= itemsPerFirstPage) {
    return 1;
  }

  const remainingItems = totalItems - itemsPerFirstPage;
  const additionalPages = Math.ceil(remainingItems / itemsPerContinuationPage);

  return 1 + additionalPages;
}

export async function generateTransactionReceiptPdf(data: TransactionPdfData): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Calculate total pages for page numbering
  const totalPages = calculateTotalPages(data);

  const ctx: PdfContext = {
    pdfDoc,
    font,
    boldFont,
    data,
    currentPage: null as unknown as PDFPage,
    y: PAGE_HEIGHT - MARGIN,
    pageNumber: 0,
    totalPages,
  };

  // Create first page
  createNewPage(ctx, true);

  // Draw line items with pagination
  data.lineItems.forEach((item, index) => {
    // Check if we need a new page before drawing this row
    if (needsNewPage(ctx)) {
      createNewPage(ctx, false);
    }
    drawLineItemRow(ctx, item, index);
  });

  // Check if we need a new page for the total row
  if (needsNewPage(ctx, ROW_HEIGHT + 5)) {
    createNewPage(ctx, false);
  }

  // Draw total row
  drawTotalRow(ctx);

  // Draw footer on the last page
  drawFooter(ctx);

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}
