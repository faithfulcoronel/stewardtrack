import { PDFDocument, StandardFonts } from 'pdf-lib';
import { format } from 'date-fns';

function splitTextIntoLines(text: string, font: any, size: number, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
      while (font.widthOfTextAtSize(current, size) > maxWidth) {
        let i = 1;
        while (
          i <= current.length &&
          font.widthOfTextAtSize(current.substring(0, i), size) <= maxWidth
        ) {
          i++;
        }
        const part = current.substring(0, i - 1);
        lines.push(part);
        current = current.substring(i - 1);
      }
    }
  }
  if (current) lines.push(current);
  return lines;
}

export interface ExpenseSummaryRecord {
  transaction_date: string | Date;
  description: string;
  category_name: string | null;
  fund_name: string | null;
  fund_balance: number;
  amount: number;
}

const formatAmount = (amount: number) =>
  amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export async function generateExpenseSummaryPdf(
  tenantName: string,
  dateRange: { from: Date; to: Date },
  records: ExpenseSummaryRecord[],
  fundBalances: { id: string; name: string; balance: number }[],
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const width = 595.28;
  const height = 841.89;

  const margin = 40;
  const rowHeight = 18;
  const tableWidth = width - margin * 2;
  const columnWidths = [
    tableWidth * 0.25,
    tableWidth * 0.35,
    tableWidth * 0.2,
    tableWidth * 0.2,
  ];

  const pages: any[] = [];
  let page = pdfDoc.addPage([width, height]);
  pages.push(page);
  let y = height - margin;


  const headerText = 'Expense Summary Report';

  const drawHeader = () => {
    y = height - margin;
    const titleWidth = boldFont.widthOfTextAtSize(headerText, 16);
    page.drawText(headerText, {
      x: width / 2 - titleWidth / 2,
      y,
      size: 16,
      font: boldFont,
    });
    y -= rowHeight;

    const tenantWidth = font.widthOfTextAtSize(tenantName, 12);
    page.drawText(tenantName, { x: width / 2 - tenantWidth / 2, y, size: 12, font });
    y -= rowHeight;

    const rangeStr = `${format(dateRange.from, 'MMM dd, yyyy')} - ${format(dateRange.to, 'MMM dd, yyyy')}`;
    const rangeWidth = font.widthOfTextAtSize(rangeStr, 12);
    page.drawText(rangeStr, { x: width / 2 - rangeWidth / 2, y, size: 12, font });
    y -= rowHeight / 2;
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 1,
    });
    y -= rowHeight;
  };

  const drawTableHeader = () => {
    const headers = ['Expense Category', 'Expense Description', 'Fund', 'Amount'];
    headers.forEach((h, idx) => {
      page.drawText(h, { x: margin + columnWidths.slice(0, idx).reduce((a, b) => a + b, 0), y, size: 10, font: boldFont });
    });
    y -= rowHeight;
  };

  const addPage = () => {
    page = pdfDoc.addPage([width, height]);
    pages.push(page);
    drawHeader();
    drawTableHeader();
  };

  drawHeader();
  drawTableHeader();

  const drawRow = (r: ExpenseSummaryRecord) => {
    const cellLines = [
      splitTextIntoLines(r.category_name || '', font, 8, columnWidths[0] - 2),
      splitTextIntoLines(r.description || '', font, 8, columnWidths[1] - 2),
      splitTextIntoLines(r.fund_name || '', font, 8, columnWidths[2] - 2),
      [formatAmount(r.amount)],
    ];
    const lines = Math.max(...cellLines.map(l => l.length));
    if (y - rowHeight * lines < margin) addPage();
    cellLines.forEach((linesArr, idx) => {
      linesArr.forEach((line, lidx) => {
        page.drawText(line, {
          x: margin + columnWidths.slice(0, idx).reduce((a, b) => a + b, 0),
          y: y - lidx * rowHeight,
          size: 8,
          font,
        });
      });
    });
    y -= rowHeight * lines;
  };

  const grouped = new Map<string, ExpenseSummaryRecord[]>();
  records.forEach(r => {
    const key = typeof r.transaction_date === 'string'
      ? r.transaction_date.substring(0, 10)
      : format(r.transaction_date, 'yyyy-MM-dd');
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(r);
  });

  Array.from(grouped.entries())
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .forEach(([dateKey, recs]) => {
      if (y - rowHeight < margin) addPage();
      const dateStr = format(new Date(dateKey), 'MMMM dd, yyyy');
      page.drawText(dateStr, { x: margin, y, size: 10, font: boldFont });
      y -= rowHeight;
      recs.forEach(r => drawRow(r));

      const subTotal = recs.reduce((sum, r) => sum + r.amount, 0);
      if (y - rowHeight < margin) addPage();
      page.drawText('Sub Total', {
        x: margin + columnWidths[0] + columnWidths[1],
        y,
        size: 10,
        font: boldFont,
      });
      page.drawText(formatAmount(subTotal), {
        x: margin + columnWidths[0] + columnWidths[1] + columnWidths[2],
        y,
        size: 10,
        font: boldFont,
      });
      y -= rowHeight * 1.5;
    });

  const total = records.reduce((sum, r) => sum + (r.amount || 0), 0);
  if (y - rowHeight < margin) addPage();
  page.drawText('Expense Grand Total', {
    x: margin + columnWidths[0] + columnWidths[1],
    y,
    size: 10,
    font: boldFont,
  });
  page.drawText(formatAmount(total), {
    x: margin + columnWidths[0] + columnWidths[1] + columnWidths[2],
    y,
    size: 10,
    font: boldFont,
  });

  y -= rowHeight * 2;
  if (y - rowHeight < margin) addPage();
  page.drawText('Fund Balances Summary', { x: margin, y, size: 12, font: boldFont });
  y -= rowHeight;
  fundBalances
    .filter(f => f.balance !== 0)
    .forEach(f => {
      if (y - rowHeight < margin) addPage();
      page.drawText(f.name, { x: margin, y, size: 10, font });
      const bal = formatAmount(f.balance);
      const tw = font.widthOfTextAtSize(bal, 10);
      page.drawText(bal, { x: width - margin - tw, y, size: 10, font });
      y -= rowHeight;
    });

  const generated = `Generated via StewardTrack on: ${format(new Date(), 'MMM dd, yyyy')}`;
  pages.forEach((p, idx) => {
    const footerY = margin / 2;
    p.drawText(generated, { x: margin, y: footerY, size: 10, font });
    const text = `Page ${idx + 1} of ${pages.length}`;
    const tw = font.widthOfTextAtSize(text, 10);
    p.drawText(text, { x: width / 2 - tw / 2, y: footerY, size: 10, font });
  });

  const pdfBytes = await pdfDoc.save(); // Uint8Array containing the PDF data
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}
