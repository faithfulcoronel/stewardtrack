import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
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
  const currencySymbol = currency === 'PHP' ? 'PHP ' : currency === 'USD' ? '$' : `${currency} `;
  return `${currencySymbol}${amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export async function generateTransactionReceiptPdf(data: TransactionPdfData): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // A4 size in points (portrait)
  const width = 595;
  const height = 842;
  const margin = 50;

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

  // Header - Church/Organization Name
  const titleText = data.tenantName;
  const titleWidth = boldFont.widthOfTextAtSize(titleText, 18);
  drawText(titleText, width / 2 - titleWidth / 2, y, { font: boldFont, size: 18 });
  y -= 20;

  // Address if provided
  if (data.tenantAddress) {
    const addressWidth = font.widthOfTextAtSize(data.tenantAddress, 10);
    drawText(data.tenantAddress, width / 2 - addressWidth / 2, y, { size: 10 });
    y -= 15;
  }

  // Document Title
  y -= 10;
  const docTitle = data.transactionType === 'income' ? 'INCOME RECEIPT' : 'EXPENSE VOUCHER';
  const docTitleWidth = boldFont.widthOfTextAtSize(docTitle, 14);
  drawText(docTitle, width / 2 - docTitleWidth / 2, y, { font: boldFont, size: 14 });
  y -= 25;

  // Horizontal line
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7),
  });
  y -= 20;

  // Transaction Info Section
  const leftCol = margin;
  const rightCol = width / 2 + 20;
  const labelWidth = 100;

  // Left column - Transaction Number and Date
  drawText('Transaction #:', leftCol, y, { font: boldFont, size: 10 });
  drawText(data.transactionNumber, leftCol + labelWidth, y, { size: 10 });

  // Right column - Status
  drawText('Status:', rightCol, y, { font: boldFont, size: 10 });
  drawText(data.status.charAt(0).toUpperCase() + data.status.slice(1), rightCol + 60, y, { size: 10 });
  y -= 15;

  // Date and Type
  drawText('Date:', leftCol, y, { font: boldFont, size: 10 });
  drawText(format(data.transactionDate, 'MMMM d, yyyy'), leftCol + labelWidth, y, { size: 10 });

  drawText('Type:', rightCol, y, { font: boldFont, size: 10 });
  drawText(data.transactionType.charAt(0).toUpperCase() + data.transactionType.slice(1), rightCol + 60, y, { size: 10 });
  y -= 15;

  // Description
  if (data.description) {
    drawText('Description:', leftCol, y, { font: boldFont, size: 10 });
    drawText(data.description, leftCol + labelWidth, y, { size: 10 });
    y -= 15;
  }

  y -= 15;

  // Line Items Table Header
  const tableLeft = margin;
  const colWidths = {
    account: 100,
    category: 90,
    fund: 80,
    source: 80,
    description: 90,
    amount: 70,
  };

  const rowHeight = 18;

  // Table Header Background
  page.drawRectangle({
    x: tableLeft,
    y: y - rowHeight + 4,
    width: width - 2 * margin,
    height: rowHeight,
    color: rgb(0.9, 0.9, 0.9),
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 0.5,
  });

  // Table Header Text
  let headerX = tableLeft + 5;
  drawText('Account', headerX, y - 8, { font: boldFont, size: 9 });
  headerX += colWidths.account;
  drawText('Category', headerX, y - 8, { font: boldFont, size: 9 });
  headerX += colWidths.category;
  drawText('Fund', headerX, y - 8, { font: boldFont, size: 9 });
  headerX += colWidths.fund;
  drawText('Source', headerX, y - 8, { font: boldFont, size: 9 });
  headerX += colWidths.source;
  drawText('Description', headerX, y - 8, { font: boldFont, size: 9 });
  headerX += colWidths.description;
  drawText('Amount', headerX, y - 8, { font: boldFont, size: 9 });

  y -= rowHeight;

  // Line Items Rows
  data.lineItems.forEach((item, index) => {
    const fillColor = index % 2 === 0 ? rgb(1, 1, 1) : rgb(0.97, 0.97, 0.97);

    page.drawRectangle({
      x: tableLeft,
      y: y - rowHeight + 4,
      width: width - 2 * margin,
      height: rowHeight,
      color: fillColor,
      borderColor: rgb(0.7, 0.7, 0.7),
      borderWidth: 0.5,
    });

    let cellX = tableLeft + 5;

    // Truncate text if too long
    const truncate = (text: string, maxWidth: number, f: any, size: number) => {
      let t = text || '—';
      while (f.widthOfTextAtSize(t, size) > maxWidth - 10 && t.length > 3) {
        t = t.substring(0, t.length - 4) + '...';
      }
      return t;
    };

    drawText(truncate(item.account, colWidths.account, font, 9), cellX, y - 8, { size: 9 });
    cellX += colWidths.account;
    drawText(truncate(item.category, colWidths.category, font, 9), cellX, y - 8, { size: 9 });
    cellX += colWidths.category;
    drawText(truncate(item.fund, colWidths.fund, font, 9), cellX, y - 8, { size: 9 });
    cellX += colWidths.fund;
    drawText(truncate(item.source, colWidths.source, font, 9), cellX, y - 8, { size: 9 });
    cellX += colWidths.source;
    drawText(truncate(item.description, colWidths.description, font, 9), cellX, y - 8, { size: 9 });
    cellX += colWidths.description;

    // Right-align amount
    const amountText = formatAmount(item.amount, data.currency);
    const amountWidth = font.widthOfTextAtSize(amountText, 9);
    drawText(amountText, tableLeft + (width - 2 * margin) - amountWidth - 5, y - 8, { size: 9 });

    y -= rowHeight;
  });

  // Total Row
  y -= 5;
  page.drawRectangle({
    x: tableLeft,
    y: y - rowHeight + 4,
    width: width - 2 * margin,
    height: rowHeight,
    color: rgb(0.85, 0.85, 0.85),
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 0.5,
  });

  drawText('TOTAL', tableLeft + 5, y - 8, { font: boldFont, size: 10 });

  const totalText = formatAmount(data.totalAmount, data.currency);
  const totalWidth = boldFont.widthOfTextAtSize(totalText, 10);
  drawText(totalText, tableLeft + (width - 2 * margin) - totalWidth - 5, y - 8, { font: boldFont, size: 10 });

  y -= rowHeight + 30;

  // Footer
  const footerY = margin + 30;

  // Signature lines
  const sigLineWidth = 150;
  const sigLineY = footerY + 30;

  // Prepared by
  page.drawLine({
    start: { x: margin, y: sigLineY },
    end: { x: margin + sigLineWidth, y: sigLineY },
    thickness: 0.5,
    color: rgb(0, 0, 0),
  });
  drawText('Prepared by', margin + sigLineWidth / 2 - font.widthOfTextAtSize('Prepared by', 8) / 2, sigLineY - 12, { size: 8 });

  // Approved by
  page.drawLine({
    start: { x: width - margin - sigLineWidth, y: sigLineY },
    end: { x: width - margin, y: sigLineY },
    thickness: 0.5,
    color: rgb(0, 0, 0),
  });
  drawText('Approved by', width - margin - sigLineWidth / 2 - font.widthOfTextAtSize('Approved by', 8) / 2, sigLineY - 12, { size: 8 });

  // Generated timestamp
  const genText = `Generated via StewardTrack on ${format(new Date(), 'MMMM d, yyyy h:mm a')}`;
  const genWidth = font.widthOfTextAtSize(genText, 8);
  drawText(genText, width / 2 - genWidth / 2, margin, { size: 8, color: rgb(0.5, 0.5, 0.5) });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}
