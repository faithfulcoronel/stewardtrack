import { PDFDocument, StandardFonts, rgb, PDFPage } from 'pdf-lib';
import { format } from 'date-fns';

export interface MemberGivingRecord {
  first_name: string;
  last_name: string;
  entry_date: string | Date;
  category_name: string | null;
  amount: number;
  member_id?: string;
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

const formatAmount = (amount: number) =>
  amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export async function generateMemberGivingSummaryPdf(
  churchName: string,
  dateRange: { from: Date; to: Date },
  records: MemberGivingRecord[],
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const width = 595.28;
  const height = 841.89;

  const margin = 40;
  const rowHeight = 18;
  const rowPadding = 2;

  const drawHeader = (p: PDFPage) => {
    let headerY = height - margin;
    const title = 'Member Giving Summary Report';
    const titleWidth = boldFont.widthOfTextAtSize(title, 16);
    p.drawText(title, {
      x: width / 2 - titleWidth / 2,
      y: headerY,
      size: 16,
      font: boldFont,
    });
    headerY -= rowHeight;

    const rangeText = `${format(dateRange.from, 'MMM dd, yyyy')} - ${format(
      dateRange.to,
      'MMM dd, yyyy',
    )}`;
    p.drawText(churchName, { x: margin, y: headerY, size: 12, font });
    const rangeWidth = font.widthOfTextAtSize(rangeText, 12);
    p.drawText(rangeText, { x: width - margin - rangeWidth, y: headerY, size: 12, font });
    headerY -= 6;
    p.drawLine({
      start: { x: margin, y: headerY },
      end: { x: width - margin, y: headerY },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    headerY -= rowHeight;
    return headerY;
  };

  const drawTitlePage = (name: string): PDFPage => {
    const p = pdfDoc.addPage([width, height]);
    let ty = height - margin * 2;
    const center = (text: string, size: number, useBold = false) => {
      const f = useBold ? boldFont : font;
      const tw = f.widthOfTextAtSize(text, size);
      p.drawText(text, { x: width / 2 - tw / 2, y: ty, size, font: f });
      ty -= rowHeight * 1.5;
    };

    center('Calaca Baptist Church of Batangas, Inc.', 18, true);
    center('Member Giving Summary Report', 16, true);
    const coverage = `${format(dateRange.from, 'MMMM d, yyyy')} \u2013 ${format(
      dateRange.to,
      'MMMM d, yyyy',
    )}`;
    center(coverage, 12);
    center(name, 14, true);

    const thanks =
      'Thank you for your faithful stewardship and generosity in support of the ministry and mission of our church. May the Lord continue to bless you richly.';
    for (const line of splitTextIntoLines(thanks, font, 12, width - margin * 2)) {
      const lw = font.widthOfTextAtSize(line, 12);
      p.drawText(line, {
        x: width / 2 - lw / 2,
        y: ty,
        size: 12,
        font,
      });
      ty -= rowHeight;
    }
    ty -= rowHeight * 0.5;
    const note =
      'This document serves as an official record of your giving and may be used for reference or accountability purposes.';
    for (const line of splitTextIntoLines(note, font, 12, width - margin * 2)) {
      const lw = font.widthOfTextAtSize(line, 12);
      p.drawText(line, {
        x: width / 2 - lw / 2,
        y: ty,
        size: 12,
        font,
      });
      ty -= rowHeight;
    }
    return p;
  };

  const addFooters = (pages: PDFPage[]) => {
    const generated = `Generated via StewardTrack on: ${format(new Date(), 'MMM dd, yyyy')}`;
    const pageCount = pages.length;
    pages.forEach((p, idx) => {
      const footerY = margin / 2;
      p.drawText(generated, { x: margin, y: footerY, size: 10, font });
      const pageText = `Page ${idx + 1} of ${pageCount}`;
      const pageWidth = font.widthOfTextAtSize(pageText, 10);
      p.drawText(pageText, {
        x: width - margin - pageWidth,
        y: footerY,
        size: 10,
        font,
      });
    });
  };

  // Filter records by the provided date range
  const filtered = records.filter(r => {
    const d = new Date(r.entry_date);
    return d >= dateRange.from && d <= dateRange.to;
  });

  interface DateGroup {
    categories: Map<string, number>;
    total: number;
  }

  const groups = new Map<
    string,
    {
      name: string;
      dates: Map<string, DateGroup>;
      categoryTotals: Map<string, number>;
      total: number;
    }
  >();

  for (const rec of filtered) {
    const key = rec.member_id || `${rec.first_name} ${rec.last_name}`;
    const name = `${rec.first_name} ${rec.last_name}`;
    if (!groups.has(key)) {
      groups.set(key, {
        name,
        dates: new Map(),
        categoryTotals: new Map(),
        total: 0,
      });
    }
    const g = groups.get(key)!;
    const dateKey = format(new Date(rec.entry_date), 'yyyy-MM-dd');
    if (!g.dates.has(dateKey)) {
      g.dates.set(dateKey, { categories: new Map(), total: 0 });
    }
    const d = g.dates.get(dateKey)!;
    const cat = rec.category_name || '';
    d.categories.set(cat, (d.categories.get(cat) || 0) + rec.amount);
    d.total += rec.amount;

    g.categoryTotals.set(cat, (g.categoryTotals.get(cat) || 0) + rec.amount);
    g.total += rec.amount;
  }

  const members = Array.from(groups.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  for (const member of members) {
    const memberPages: PDFPage[] = [];

    memberPages.push(drawTitlePage(member.name));

    let page!: PDFPage;
    let y!: number;
    const newPage = () => {
      page = pdfDoc.addPage([width, height]);
      memberPages.push(page);
      y = drawHeader(page);
    };

    newPage();

    page.drawText(member.name, { x: margin, y, size: 12, font: boldFont });
    y -= rowHeight;

    const dates = Array.from(member.dates.entries()).sort(
      (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime(),
    );

    for (const [dateKey, dateGroup] of dates) {
      if (y - rowHeight < margin) newPage();
      page.drawText(format(new Date(dateKey), 'MMMM dd, yyyy'), {
        x: margin + 4,
        y,
        size: 11,
        font: boldFont,
        color: rgb(0.3, 0.3, 0.3),
      });
      y -= rowHeight;

      const cats = Array.from(dateGroup.categories.entries()).sort((a, b) =>
        a[0].localeCompare(b[0]),
      );
      let rowIdx = 0;
      for (const [cat, amt] of cats) {
        if (y - rowHeight < margin) newPage();
        const fill =
          rowIdx % 2 === 1 ? rgb(249 / 255, 249 / 255, 249 / 255) : rgb(1, 1, 1);
        page.drawRectangle({
          x: margin,
          y: y - rowHeight + rowPadding,
          width: width - margin * 2,
          height: rowHeight - rowPadding * 2,
          color: fill,
        });
        page.drawText(cat, { x: margin + 8, y, size: 11, font });
        const amtStr = formatAmount(amt);
        const amtWidth = font.widthOfTextAtSize(amtStr, 11);
        page.drawText(amtStr, {
          x: width - margin - amtWidth,
          y,
          size: 11,
          font,
        });
        y -= rowHeight;
        rowIdx++;
      }

      if (y - rowHeight < margin) newPage();
      const fill =
        rowIdx % 2 === 1 ? rgb(249 / 255, 249 / 255, 249 / 255) : rgb(1, 1, 1);
      page.drawRectangle({
        x: margin,
        y: y - rowHeight + rowPadding,
        width: width - margin * 2,
        height: rowHeight - rowPadding * 2,
        color: fill,
      });
      const subLabel = 'Sub Total';
      const subStr = formatAmount(dateGroup.total);
      page.drawText(subLabel, { x: margin + 8, y, size: 11, font: boldFont });
      const subWidth = boldFont.widthOfTextAtSize(subStr, 11);
      page.drawText(subStr, {
        x: width - margin - subWidth,
        y,
        size: 11,
        font: boldFont,
      });
      y -= rowHeight * 1.5;
    }

    // add space before summary section
    y -= rowHeight;

    const summaryCats = Array.from(member.categoryTotals.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
    if (summaryCats.length > 0) {
      if (y - rowHeight < margin) newPage();
      page.drawText('Summary of Giving', { x: margin + 2, y, size: 11, font: boldFont });
      y -= rowHeight;

      const headerCat = 'Offering Category';
      const headerAmt = 'Total Amount';
      page.drawText(headerCat, { x: margin + 8, y, size: 11, font: boldFont });
      const headerAmtWidth = boldFont.widthOfTextAtSize(headerAmt, 11);
      page.drawText(headerAmt, {
        x: width - margin - headerAmtWidth,
        y,
        size: 11,
        font: boldFont,
      });
      y -= rowHeight;

      let rowIdx = 0;
      for (const [cat, amt] of summaryCats) {
        if (y - rowHeight < margin) newPage();
        const fill = rowIdx % 2 === 1 ? rgb(249 / 255, 249 / 255, 249 / 255) : rgb(1, 1, 1);
        page.drawRectangle({
          x: margin,
          y: y - rowHeight + rowPadding,
          width: width - margin * 2,
          height: rowHeight - rowPadding * 2,
          color: fill,
        });
        page.drawText(cat, { x: margin + 8, y, size: 11, font });
        const amtStr = formatAmount(amt);
        const amtWidth = font.widthOfTextAtSize(amtStr, 11);
        page.drawText(amtStr, {
          x: width - margin - amtWidth,
          y,
          size: 11,
          font,
        });
        y -= rowHeight;
        rowIdx++;
      }

      if (y - rowHeight < margin) newPage();
      page.drawLine({
        start: { x: margin, y: y + 2 },
        end: { x: width - margin, y: y + 2 },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7),
      });
      const fill = rowIdx % 2 === 1 ? rgb(249 / 255, 249 / 255, 249 / 255) : rgb(1, 1, 1);
      page.drawRectangle({
        x: margin,
        y: y - rowHeight + rowPadding,
        width: width - margin * 2,
        height: rowHeight - rowPadding * 2,
        color: fill,
      });
      page.drawText('Grand Total', { x: margin + 8, y, size: 11, font: boldFont });
      const totalStr = formatAmount(member.total);
      const totalWidth = boldFont.widthOfTextAtSize(totalStr, 11);
      page.drawText(totalStr, {
        x: width - margin - totalWidth,
        y,
        size: 11,
        font: boldFont,
      });
      y -= rowHeight * 1.5;
    }

    addFooters(memberPages.slice(1));
  }

  const pdfBytes = await pdfDoc.save(); // Uint8Array containing the PDF data
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}
