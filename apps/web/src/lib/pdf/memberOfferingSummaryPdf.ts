import { PDFDocument, StandardFonts, rgb, PDFPage } from 'pdf-lib';
import { format } from 'date-fns';

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

export interface MemberOfferingRecord {
  entry_date: string | Date;
  first_name: string;
  last_name: string;
  category_name: string | null;
  amount: number;
}

const formatAmount = (amount: number) =>
  amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export async function generateMemberOfferingSummaryPdf(
  tenantName: string,
  dateRange: { from: Date; to: Date },
  records: MemberOfferingRecord[],
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const width = 841.89;
  const height = 595.28;

  const margin = 60;
  const rowHeight = 18;
  const spacing = 1;

  const categories = Array.from(
    new Set(records.map(r => r.category_name || 'Uncategorized')),
  ).sort();

  const tableWidth = width - margin * 2 - spacing * (categories.length + 2);
  const memberColWidth = tableWidth * 0.15;
  const colWidth = (tableWidth - memberColWidth) / (categories.length + 1);

  interface MemberTotals {
    [cat: string]: number;
  }

  const grouped = new Map<string, Map<string, MemberTotals>>();
  records.forEach(r => {
    const dateKey =
      typeof r.entry_date === 'string'
        ? r.entry_date.substring(0, 10)
        : format(r.entry_date, 'yyyy-MM-dd');
    const member = `${r.first_name} ${r.last_name}`;
    const cat = r.category_name || 'Uncategorized';
    if (!grouped.has(dateKey)) grouped.set(dateKey, new Map());
    const dateMap = grouped.get(dateKey)!;
    if (!dateMap.has(member)) dateMap.set(member, {} as MemberTotals);
    const m = dateMap.get(member)!;
    m[cat] = (m[cat] || 0) + r.amount;
  });

  let page: PDFPage;
  let y = 0;
  const pages: PDFPage[] = [];

  const drawHeader = () => {
    let ty = height - margin;
    const title = 'Offering Summary by Member';
    const tw = boldFont.widthOfTextAtSize(title, 16);
    page.drawText(title, { x: width / 2 - tw / 2, y: ty, size: 16, font: boldFont });
    ty -= rowHeight;

    const churchW = font.widthOfTextAtSize(tenantName, 12);
    page.drawText(tenantName, { x: width / 2 - churchW / 2, y: ty, size: 12, font });
    ty -= rowHeight;

    const rangeStr = `${format(dateRange.from, 'MMM dd, yyyy')} - ${format(
      dateRange.to,
      'MMM dd, yyyy',
    )}`;
    const rangeW = font.widthOfTextAtSize(rangeStr, 12);
    page.drawText(rangeStr, { x: width / 2 - rangeW / 2, y: ty, size: 12, font });
    ty -= rowHeight;

    const genText = `Generated via StewardTrack on: ${format(new Date(), 'MMMM d, yyyy')}`;
    const genW = font.widthOfTextAtSize(genText, 10);
    page.drawText(genText, { x: width - margin - genW, y: ty, size: 10, font });
    ty -= 6;
    page.drawLine({
      start: { x: margin, y: ty },
      end: { x: width - margin, y: ty },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    ty -= rowHeight;
    y = ty;
  };

  const drawTableHeader = () => {
    let x = margin;
    const headerBg = rgb(0.9, 0.9, 0.9);
    const border = rgb(0, 0, 0);
    const cells = [
      { text: 'Member Name', width: memberColWidth, alignRight: false },
      ...categories.map(cat => ({ text: cat, width: colWidth, alignRight: true })),
      { text: 'Total', width: colWidth, alignRight: true },
    ];

    const lineArrays = cells.map(c =>
      splitTextIntoLines(c.text, boldFont, 10, c.width - 8),
    );
    const headerLines = Math.max(...lineArrays.map(l => l.length));
    const headerHeight = rowHeight * headerLines;

    cells.forEach((cell, idx) => {
      page.drawRectangle({
        x,
        y: y - headerHeight + 4,
        width: cell.width,
        height: headerHeight,
        color: headerBg,
        borderColor: border,
        borderWidth: 0.5,
      });
      const lines = lineArrays[idx];
      lines.forEach((line, li) => {
        const w = boldFont.widthOfTextAtSize(line, 10);
        const tx = cell.alignRight ? x + cell.width - w - 4 : x + 4;
        page.drawText(line, {
          x: tx,
          y: y - rowHeight * li - 8,
          font: boldFont,
          size: 10,
        });
      });
      x += cell.width + spacing;
    });
    y -= headerHeight;
  };

  const addPage = () => {
    page = pdfDoc.addPage([width, height]);
    pages.push(page);
    drawHeader();
    drawTableHeader();
  };

  const drawRow = (
    label: string,
    data: MemberTotals,
    rowIdx: number,
    bold = false,
  ) => {
    if (y - rowHeight < margin) addPage();
    let x = margin;
    const fillColor = rowIdx % 2 === 0 ? rgb(1, 1, 1) : rgb(0.98, 0.98, 0.98);
    const border = rgb(0, 0, 0);
    const f = bold ? boldFont : font;
    const drawCell = (text: string, width: number, alignRight = false) => {
      page.drawRectangle({
        x,
        y: y - rowHeight + 4,
        width,
        height: rowHeight,
        color: fillColor,
        borderColor: border,
        borderWidth: 0.5,
      });
      const w = f.widthOfTextAtSize(text, 10);
      const tx = alignRight ? x + width - w - 4 : x + 4;
      page.drawText(text, { x: tx, y: y - 8, size: 10, font: f });
      x += width + spacing;
    };
    drawCell(label, memberColWidth);
    let total = 0;
    categories.forEach(cat => {
      const amt = data[cat] || 0;
      total += amt;
      drawCell(formatAmount(amt), colWidth, true);
    });
    drawCell(formatAmount(total), colWidth, true);
    y -= rowHeight;
  };

  addPage();

  const summary: MemberTotals = {};

  Array.from(grouped.entries())
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .forEach(([dateKey, members]) => {
      if (y - rowHeight < margin) addPage();
      page.drawText(format(new Date(dateKey), 'MMMM dd, yyyy'), {
        x: margin,
        y,
        size: 10,
        font: boldFont,
      });
      y -= rowHeight;

      const dateTotals: MemberTotals = {};
      let idx = 0;
      Array.from(members.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([name, vals]) => {
          drawRow(name, vals, idx);
          categories.forEach(cat => {
            const v = vals[cat] || 0;
            dateTotals[cat] = (dateTotals[cat] || 0) + v;
            summary[cat] = (summary[cat] || 0) + v;
          });
          idx++;
        });
      drawRow('Sub Total', dateTotals, idx, true);
      y -= rowHeight * 0.5;
    });

  drawRow('Summary Total', summary, 0, true);

  const pageCount = pages.length;
  pages.forEach((p, idx) => {
    const text = `Page ${idx + 1} of ${pageCount}`;
    const tw = font.widthOfTextAtSize(text, 10);
    p.drawText(text, { x: width / 2 - tw / 2, y: margin / 2, size: 10, font });
  });

  const pdfBytes = await pdfDoc.save(); // Uint8Array containing the PDF data
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

