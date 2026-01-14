import { PDFDocument, StandardFonts } from 'pdf-lib';
import { formatCurrency, SupportedCurrency, DEFAULT_CURRENCY } from '@/enums/currency.enums';

export interface PdfOptions {
  title: string;
  fileName: string;
  /** Font size for table cell contents */
  cellFontSize?: number;
  /** Currency code for formatting amounts (defaults to PHP) */
  currency?: SupportedCurrency | string;
}

export interface PdfColumn {
  key: string;
  header: string;
}

function splitTextIntoLines(
  text: string,
  font: any,
  size: number,
  maxWidth: number,
) {
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

export async function exportReportPdf(
  data: Record<string, any>[] | undefined,
  columns: PdfColumn[],
  { title, fileName, cellFontSize = 12, currency = DEFAULT_CURRENCY }: PdfOptions,
) {
  if (!data || data.length === 0) return;
  if (columns.length === 0) return;

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  let page = pdfDoc.addPage();
  const { width, height } = page.getSize();

  const margin = 40;
  const rowHeight = 16;
  const columnWidth = (width - margin * 2) / columns.length;
  let y = height - margin;
  let pageNumber = 1;

  const drawPageNumber = (p: any, num: number) => {
    const text = `Page ${num}`;
    const textWidth = font.widthOfTextAtSize(text, 10);
    p.drawText(text, {
      x: width / 2 - textWidth / 2,
      y: margin / 2,
      size: 10,
      font,
    });
  };

  page.drawText(title, { x: margin, y, size: 18, font: boldFont });
  y -= 24;

  const drawHeaders = () => {
    columns.forEach((col, index) => {
      page.drawText(col.header, {
        x: margin + index * columnWidth,
        y,
        size: 12,
        font: boldFont,
      });
    });
    y -= rowHeight;
  };

  drawHeaders();
  for (const rec of data) {
    const cellLines = columns.map(col => {
      let value = rec[col.key];
      const key = col.key.toLowerCase();
      const header = col.header.toLowerCase();
      if (
        ['debit', 'credit', 'amount','income','expenses','net change','total amount'].includes(key) ||
        ['debit', 'credit', 'amount','income','expenses','net change','total amount'].includes(header)
      ) {
        value = formatCurrency(Number(value) || 0, currency);
      }
      return splitTextIntoLines(
        String(value ?? ''),
        font,
        cellFontSize,
        columnWidth - 2,
      );
    });

    const maxLines = Math.max(...cellLines.map(l => l.length));
    if (y - rowHeight * maxLines < margin) {
      drawPageNumber(page, pageNumber);
      pageNumber++;
      page = pdfDoc.addPage();
      y = height - margin;
      drawHeaders();
    }

    cellLines.forEach((lines, index) => {
      lines.forEach((line, lineIdx) => {
        page.drawText(line, {
          x: margin + index * columnWidth,
          y: y - lineIdx * rowHeight,
          font,
          size: cellFontSize,
        });
      });
    });
    y -= rowHeight * maxLines;
  }

  if (columns.some(c => c.key === 'amount')) {
    if (y - rowHeight < margin) {
      drawPageNumber(page, pageNumber);
      pageNumber++;
      page = pdfDoc.addPage();
      y = height - margin;
      drawHeaders();
    }
    const total = data.reduce((acc, cur) => acc + (Number(cur.amount) || 0), 0);
    y -= 8;
    const amountIndex = columns.findIndex(c => c.key === 'amount');
    page.drawText(`Total: ${formatCurrency(total, currency)}`, {
      x: margin + amountIndex * columnWidth,
      y,
      size: cellFontSize,
      font: boldFont,
    });
  }

  drawPageNumber(page, pageNumber);

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
