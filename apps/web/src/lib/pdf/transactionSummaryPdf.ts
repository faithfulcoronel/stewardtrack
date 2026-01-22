import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { format } from 'date-fns';

export interface TransactionSummaryLineItem {
  accountId: string;
  accountName: string;
  categoryId: string;
  categoryName: string;
  amount: number;
}

export interface TransactionSummaryPdfData {
  // Header info
  transactionNumber: string;
  transactionDate: Date;
  transactionType: 'income' | 'expense';
  status: string;
  description: string;
  // Line items for pivot
  lineItems: TransactionSummaryLineItem[];
  // Tenant info
  tenantName: string;
  tenantAddress?: string;
  currency: string;
}

interface PivotCell {
  amount: number;
}

interface PivotRow {
  accountId: string;
  accountName: string;
  cells: Map<string, PivotCell>; // categoryId -> cell
  rowTotal: number;
}

const formatAmount = (amount: number, currency: string) => {
  const currencySymbol = currency === 'PHP' ? 'PHP ' : currency === 'USD' ? '$' : `${currency} `;
  return `${currencySymbol}${amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export async function generateTransactionSummaryPdf(data: TransactionSummaryPdfData): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // A4 size in points - LANDSCAPE orientation for more columns
  const width = 842;
  const height = 595;
  const margin = 40;

  const page = pdfDoc.addPage([width, height]);
  let y = height - margin;

  // Helper to draw text
  const drawText = (text: string, x: number, yPos: number, options: { font?: any; size?: number; color?: any } = {}) => {
    page.drawText(text, {
      x,
      y: yPos,
      font: options.font || font,
      size: options.size || 10,
      color: options.color || rgb(0, 0, 0),
    });
  };

  // ==================== HEADER SECTION ====================

  // Organization Name
  const titleText = data.tenantName;
  const titleWidth = boldFont.widthOfTextAtSize(titleText, 16);
  drawText(titleText, width / 2 - titleWidth / 2, y, { font: boldFont, size: 16 });
  y -= 18;

  // Address if provided
  if (data.tenantAddress) {
    const addressWidth = font.widthOfTextAtSize(data.tenantAddress, 9);
    drawText(data.tenantAddress, width / 2 - addressWidth / 2, y, { size: 9 });
    y -= 14;
  }

  // Document Title
  y -= 8;
  const docTitle = 'TRANSACTION SUMMARY REPORT';
  const docTitleWidth = boldFont.widthOfTextAtSize(docTitle, 12);
  drawText(docTitle, width / 2 - docTitleWidth / 2, y, { font: boldFont, size: 12 });
  y -= 20;

  // Horizontal line
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7),
  });
  y -= 18;

  // ==================== TRANSACTION DETAILS ====================

  const leftCol = margin;
  const rightCol = width / 2 + 20;
  const labelWidth = 90;

  // Row 1: Transaction # and Status
  drawText('Transaction #:', leftCol, y, { font: boldFont, size: 9 });
  drawText(data.transactionNumber, leftCol + labelWidth, y, { size: 9 });

  drawText('Status:', rightCol, y, { font: boldFont, size: 9 });
  drawText(data.status.charAt(0).toUpperCase() + data.status.slice(1), rightCol + 50, y, { size: 9 });
  y -= 14;

  // Row 2: Date and Type
  drawText('Date:', leftCol, y, { font: boldFont, size: 9 });
  drawText(format(data.transactionDate, 'MMMM d, yyyy'), leftCol + labelWidth, y, { size: 9 });

  drawText('Type:', rightCol, y, { font: boldFont, size: 9 });
  drawText(data.transactionType.charAt(0).toUpperCase() + data.transactionType.slice(1), rightCol + 50, y, { size: 9 });
  y -= 14;

  // Row 3: Description
  if (data.description) {
    drawText('Description:', leftCol, y, { font: boldFont, size: 9 });
    // Truncate description if too long
    let desc = data.description;
    const maxDescWidth = width - margin * 2 - labelWidth - 20;
    while (font.widthOfTextAtSize(desc, 9) > maxDescWidth && desc.length > 10) {
      desc = desc.substring(0, desc.length - 4) + '...';
    }
    drawText(desc, leftCol + labelWidth, y, { size: 9 });
    y -= 14;
  }

  y -= 10;

  // ==================== BUILD PIVOT TABLE ====================

  // Get unique categories and accounts
  const categoriesMap = new Map<string, string>(); // id -> name
  const accountsMap = new Map<string, string>(); // id -> name

  for (const item of data.lineItems) {
    if (item.categoryId && item.categoryName) {
      categoriesMap.set(item.categoryId, item.categoryName);
    }
    if (item.accountId && item.accountName) {
      accountsMap.set(item.accountId, item.accountName);
    }
  }

  const categories = Array.from(categoriesMap.entries()).map(([id, name]) => ({ id, name }));
  const accounts = Array.from(accountsMap.entries()).map(([id, name]) => ({ id, name }));

  // Sort alphabetically
  categories.sort((a, b) => a.name.localeCompare(b.name));
  accounts.sort((a, b) => a.name.localeCompare(b.name));

  // Build pivot data
  const pivotRows: PivotRow[] = [];
  const categoryTotals = new Map<string, number>(); // categoryId -> total

  // Initialize category totals
  for (const cat of categories) {
    categoryTotals.set(cat.id, 0);
  }

  for (const account of accounts) {
    const row: PivotRow = {
      accountId: account.id,
      accountName: account.name,
      cells: new Map(),
      rowTotal: 0,
    };

    // Initialize cells for all categories
    for (const cat of categories) {
      row.cells.set(cat.id, { amount: 0 });
    }

    // Populate cells from line items
    for (const item of data.lineItems) {
      if (item.accountId === account.id && item.categoryId) {
        const cell = row.cells.get(item.categoryId);
        if (cell) {
          cell.amount += item.amount;
          row.rowTotal += item.amount;
          categoryTotals.set(item.categoryId, (categoryTotals.get(item.categoryId) || 0) + item.amount);
        }
      }
    }

    pivotRows.push(row);
  }

  // Calculate grand total
  let grandTotal = 0;
  for (const total of categoryTotals.values()) {
    grandTotal += total;
  }

  // ==================== RENDER PIVOT TABLE ====================

  // Calculate column widths - landscape gives more room for categories
  const numCategories = categories.length;
  const accountColWidth = 140;
  const totalColWidth = 90;
  const availableWidth = width - margin * 2 - accountColWidth - totalColWidth;
  const categoryColWidth = numCategories > 0 ? Math.min(100, availableWidth / numCategories) : 100;

  const tableLeft = margin;
  const rowHeight = 16;

  // Section title
  drawText('Summary by Account and Category', tableLeft, y, { font: boldFont, size: 10 });
  y -= 18;

  // Table Header Row
  page.drawRectangle({
    x: tableLeft,
    y: y - rowHeight + 4,
    width: width - margin * 2,
    height: rowHeight,
    color: rgb(0.85, 0.85, 0.85),
    borderColor: rgb(0.6, 0.6, 0.6),
    borderWidth: 0.5,
  });

  // Header: Account
  let headerX = tableLeft + 4;
  drawText('Account', headerX, y - 8, { font: boldFont, size: 8 });
  headerX += accountColWidth;

  // Header: Category names
  for (const cat of categories) {
    let catName = cat.name;
    // Truncate if needed
    while (boldFont.widthOfTextAtSize(catName, 8) > categoryColWidth - 6 && catName.length > 3) {
      catName = catName.substring(0, catName.length - 4) + '...';
    }
    drawText(catName, headerX, y - 8, { font: boldFont, size: 8 });
    headerX += categoryColWidth;
  }

  // Header: Total
  drawText('Total', headerX, y - 8, { font: boldFont, size: 8 });

  y -= rowHeight;

  // Data Rows
  for (let i = 0; i < pivotRows.length; i++) {
    const row = pivotRows[i];
    const fillColor = i % 2 === 0 ? rgb(1, 1, 1) : rgb(0.96, 0.96, 0.96);

    page.drawRectangle({
      x: tableLeft,
      y: y - rowHeight + 4,
      width: width - margin * 2,
      height: rowHeight,
      color: fillColor,
      borderColor: rgb(0.7, 0.7, 0.7),
      borderWidth: 0.5,
    });

    let cellX = tableLeft + 4;

    // Account name
    let accName = row.accountName;
    while (font.widthOfTextAtSize(accName, 8) > accountColWidth - 6 && accName.length > 3) {
      accName = accName.substring(0, accName.length - 4) + '...';
    }
    drawText(accName, cellX, y - 8, { size: 8 });
    cellX += accountColWidth;

    // Category amounts
    for (const cat of categories) {
      const cell = row.cells.get(cat.id);
      const amount = cell?.amount || 0;
      const amountText = amount > 0 ? formatAmount(amount, data.currency) : '—';
      // Right-align amount within column
      const amountWidth = font.widthOfTextAtSize(amountText, 8);
      drawText(amountText, cellX + categoryColWidth - amountWidth - 6, y - 8, { size: 8 });
      cellX += categoryColWidth;
    }

    // Row total
    const rowTotalText = formatAmount(row.rowTotal, data.currency);
    const rowTotalWidth = boldFont.widthOfTextAtSize(rowTotalText, 8);
    drawText(rowTotalText, cellX + totalColWidth - rowTotalWidth - 6, y - 8, { font: boldFont, size: 8 });

    y -= rowHeight;
  }

  // Grand Total Row
  y -= 2;
  page.drawRectangle({
    x: tableLeft,
    y: y - rowHeight + 4,
    width: width - margin * 2,
    height: rowHeight,
    color: rgb(0.8, 0.8, 0.8),
    borderColor: rgb(0.6, 0.6, 0.6),
    borderWidth: 0.5,
  });

  let totalX = tableLeft + 4;
  drawText('GRAND TOTAL', totalX, y - 8, { font: boldFont, size: 8 });
  totalX += accountColWidth;

  // Category totals
  for (const cat of categories) {
    const catTotal = categoryTotals.get(cat.id) || 0;
    const catTotalText = catTotal > 0 ? formatAmount(catTotal, data.currency) : '—';
    const catTotalWidth = boldFont.widthOfTextAtSize(catTotalText, 8);
    drawText(catTotalText, totalX + categoryColWidth - catTotalWidth - 6, y - 8, { font: boldFont, size: 8 });
    totalX += categoryColWidth;
  }

  // Grand total
  const grandTotalText = formatAmount(grandTotal, data.currency);
  const grandTotalWidth = boldFont.widthOfTextAtSize(grandTotalText, 8);
  drawText(grandTotalText, totalX + totalColWidth - grandTotalWidth - 6, y - 8, { font: boldFont, size: 8 });

  y -= rowHeight + 25;

  // ==================== FOOTER ====================

  // Generated timestamp
  const genText = `Generated via StewardTrack on ${format(new Date(), 'MMMM d, yyyy h:mm a')}`;
  const genWidth = font.widthOfTextAtSize(genText, 8);
  drawText(genText, width / 2 - genWidth / 2, margin, { size: 8, color: rgb(0.5, 0.5, 0.5) });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}
