import { PDFDocument, StandardFonts, rgb, PDFPage } from 'pdf-lib';
import { format } from 'date-fns';

export interface FinancialSummaryRecord {
  opening_balance: number;
  total_income: number;
  total_expenses: number;
  net_result: number;
  ending_balance: number;
}

export interface FundBalanceRecord {
  fund_name: string;
  opening_balance: number;
  income: number;
  expenses: number;
  ending_balance: number;
}

export interface CategoryRecord {
  category_name: string;
  amount: number;
}

export interface AccountCategorySummary {
  account_name: string;
  categories: CategoryRecord[];
  subtotal: number;
}

export interface MemberGivingSummaryRecord {
  member_name: string;
  categories: CategoryRecord[];
  total: number;
}

export interface ChurchFinancialStatementData {
  summary: FinancialSummaryRecord;
  funds: FundBalanceRecord[];
  income: AccountCategorySummary[];
  expenses: AccountCategorySummary[];
  memberGiving: MemberGivingSummaryRecord[];
  remarks?: string;
}

const formatAmount = (amount: number) =>
  amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const drawHeader = (
  page: PDFPage,
  title: string,
  church: string,
  range: string,
  width: number,
  height: number,
  font: any,
  boldFont: any,
  margin: number,
  rowHeight: number,
) => {
  let y = height - margin;
  const tw = boldFont.widthOfTextAtSize(title, 16);
  page.drawText(title, { x: width / 2 - tw / 2, y, size: 16, font: boldFont });
  y -= rowHeight;
  const cw = font.widthOfTextAtSize(church, 12);
  page.drawText(church, { x: width / 2 - cw / 2, y, size: 12, font });
  y -= rowHeight;
  const rw = font.widthOfTextAtSize(range, 12);
  page.drawText(range, { x: width / 2 - rw / 2, y, size: 12, font });
  y -= rowHeight / 2;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1 });
  y -= rowHeight;
  return y;
};

const addFooters = (
  pages: PDFPage[],
  width: number,
  margin: number,
  font: any,
) => {
  const generated = `Generated via StewardTrack on: ${format(new Date(), 'MMM dd, yyyy')}`;
  pages.forEach((p, i) => {
    const footerY = margin / 2;
    p.drawText(generated, { x: margin, y: footerY, size: 10, font });
    const text = `Page ${i + 1} of ${pages.length}`;
    const tw = font.widthOfTextAtSize(text, 10);
    p.drawText(text, { x: width - margin - tw, y: footerY, size: 10, font });
  });
};

export async function generateChurchFinancialStatementPdf(
  churchName: string,
  dateRange: { from: Date; to: Date },
  data: ChurchFinancialStatementData,
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const width = 841.89;
  const height = 595.28;
  const margin = 40;
  const rowHeight = 18;

  const pages: PDFPage[] = [];

  const rangeStr = `${format(dateRange.from, 'MMM dd, yyyy')} - ${format(
    dateRange.to,
    'MMM dd, yyyy',
  )}`;

  // Cover Page
  let page = pdfDoc.addPage([width, height]);
  pages.push(page);
  let y = height - margin * 2;
  const centerCover = (text: string, size: number, useBold = false) => {
    const f = useBold ? boldFont : font;
    const tw = f.widthOfTextAtSize(text, size);
    page.drawText(text, { x: width / 2 - tw / 2, y, size, font: f });
    y -= rowHeight * 1.5;
  };
  centerCover(churchName, 18, true);
  centerCover('Comprehensive Church Financial Statement', 16, true);
  centerCover(rangeStr, 12);
  centerCover(
    `Generated via StewardTrack on: ${format(new Date(), 'MMM dd, yyyy')}`,
    10,
  );
  y -= rowHeight;

  // Summary Page
  page = pdfDoc.addPage([width, height]);
  pages.push(page);
  y = drawHeader(
    page,
    'Comprehensive Church Financial Statement',
    churchName,
    rangeStr,
    width,
    height,
    font,
    boldFont,
    margin,
    rowHeight,
  );

  const summaryLabels = [
    'Opening Balance',
    'Total Income',
    'Total Expenses',
    'Net Result',
    'Ending Balance',
  ];
  const summaryValues = [
    data.summary.opening_balance,
    data.summary.total_income,
    data.summary.total_expenses,
    data.summary.net_result,
    data.summary.ending_balance,
  ];
  summaryLabels.forEach((label, idx) => {
    const value = summaryValues[idx];
    if (value === 0) return;
    page.drawText(label, { x: margin, y, size: 12, font });
    const val = formatAmount(value);
    const vw = font.widthOfTextAtSize(val, 12);
    page.drawText(val, { x: width - margin - vw, y, size: 12, font: boldFont });
    y -= rowHeight;
  });

  // Fund Balances Page
  page = pdfDoc.addPage([width, height]);
  pages.push(page);
  y = drawHeader(
    page,
    'Fund Balances',
    churchName,
    rangeStr,
    width,
    height,
    font,
    boldFont,
    margin,
    rowHeight,
  );
  const fundHeaders = ['Fund', 'Opening', 'Income', 'Expenses', 'Ending'];
  const colWidth = (width - margin * 2) / fundHeaders.length;
  const drawFundHeader = () => {
    fundHeaders.forEach((h, i) => {
      page.drawText(h, { x: margin + colWidth * i, y, size: 12, font: boldFont });
    });
    y -= rowHeight;
  };
  const newFundPage = () => {
    page = pdfDoc.addPage([width, height]);
    pages.push(page);
    y = drawHeader(
      page,
      'Fund Balances',
      churchName,
      rangeStr,
      width,
      height,
      font,
      boldFont,
      margin,
      rowHeight,
    );
    drawFundHeader();
  };
  drawFundHeader();
    data.funds
      .filter(f =>
        f.opening_balance !== 0 || f.income !== 0 || f.expenses !== 0 || f.ending_balance !== 0,
      )
      .forEach(f => {
        if (y - rowHeight < margin) newFundPage();
      const vals = [
        f.fund_name,
        formatAmount(f.opening_balance),
        formatAmount(f.income),
        formatAmount(f.expenses),
        formatAmount(f.ending_balance),
      ];
      vals.forEach((v, i) => {
        const fnt = i === 0 ? font : boldFont;
        const x = margin + colWidth * i;
        const val = typeof v === 'string' ? v : String(v);
        page.drawText(val, { x, y, size: 11, font: fnt });
      });
      y -= rowHeight;
    });

  y -= rowHeight;
  if (y - rowHeight < margin) newFundPage();

  const totals = data.funds
    .filter(f =>
      f.opening_balance !== 0 || f.income !== 0 || f.expenses !== 0 || f.ending_balance !== 0,
    )
    .reduce(
      (acc, f) => {
        acc.opening += f.opening_balance;
        acc.income += f.income;
        acc.expenses += f.expenses;
        acc.ending += f.ending_balance;
        return acc;
      },
      { opening: 0, income: 0, expenses: 0, ending: 0 },
    );

  if (totals.opening !== 0 || totals.income !== 0 || totals.expenses !== 0 || totals.ending !== 0) {
    if (y - rowHeight < margin) newFundPage();
    const totalVals = [
      'Subtotal',
      formatAmount(totals.opening),
      formatAmount(totals.income),
      formatAmount(totals.expenses),
      formatAmount(totals.ending),
    ];
    totalVals.forEach((v, i) => {
      const x = margin + colWidth * i;
      page.drawText(v, { x, y, size: 11, font: boldFont });
    });
    y -= rowHeight * 1.5;
  }

  // Income Summary Page
  page = pdfDoc.addPage([width, height]);
  pages.push(page);
  const addIncomePage = () => {
    page = pdfDoc.addPage([width, height]);
    pages.push(page);
    y = drawHeader(
      page,
      'Income Summary',
      churchName,
      rangeStr,
      width,
      height,
      font,
      boldFont,
      margin,
      rowHeight,
    );
  };
  y = drawHeader(
    page,
    'Income Summary',
    churchName,
    rangeStr,
    width,
    height,
    font,
    boldFont,
    margin,
    rowHeight,
  );
  data.income
    .map(acc => ({
      ...acc,
      categories: acc.categories.filter(c => c.amount !== 0),
    }))
    .filter(acc => acc.subtotal !== 0 && acc.categories.length > 0)
    .forEach(acc => {
      if (y - rowHeight < margin) addIncomePage();
      page.drawText(acc.account_name, { x: margin, y, size: 12, font: boldFont });
      y -= rowHeight;
      acc.categories.forEach(cat => {
        if (y - rowHeight < margin) addIncomePage();
        const label = `- ${cat.category_name}`;
        page.drawText(label, { x: margin + 20, y, size: 11, font });
        const amt = formatAmount(cat.amount);
        const aw = font.widthOfTextAtSize(amt, 11);
        page.drawText(amt, { x: width - margin - aw, y, size: 11, font });
        y -= rowHeight;
      });
      const sub = formatAmount(acc.subtotal);
      const sw = boldFont.widthOfTextAtSize(sub, 11);
      if (y - rowHeight < margin) addIncomePage();
      page.drawText('Subtotal', { x: margin + 20, y, size: 11, font: boldFont });
      page.drawText(sub, { x: width - margin - sw, y, size: 11, font: boldFont });
      y -= rowHeight * 1.5;
    });

  // Expense Summary Page
  page = pdfDoc.addPage([width, height]);
  pages.push(page);
  const addExpensePage = () => {
    page = pdfDoc.addPage([width, height]);
    pages.push(page);
    y = drawHeader(
      page,
      'Expense Summary',
      churchName,
      rangeStr,
      width,
      height,
      font,
      boldFont,
      margin,
      rowHeight,
    );
  };
  y = drawHeader(
    page,
    'Expense Summary',
    churchName,
    rangeStr,
    width,
    height,
    font,
    boldFont,
    margin,
    rowHeight,
  );
  data.expenses
    .map(acc => ({
      ...acc,
      categories: acc.categories.filter(c => c.amount !== 0),
    }))
    .filter(acc => acc.subtotal !== 0 && acc.categories.length > 0)
    .forEach(acc => {
      if (y - rowHeight < margin) addExpensePage();
      page.drawText(acc.account_name, { x: margin, y, size: 12, font: boldFont });
      y -= rowHeight;
      acc.categories.forEach(cat => {
        if (y - rowHeight < margin) addExpensePage();
        const label = `- ${cat.category_name}`;
        page.drawText(label, { x: margin + 20, y, size: 11, font });
        const amt = formatAmount(cat.amount);
        const aw = font.widthOfTextAtSize(amt, 11);
        page.drawText(amt, { x: width - margin - aw, y, size: 11, font });
        y -= rowHeight;
      });
      const sub = formatAmount(acc.subtotal);
      const sw = boldFont.widthOfTextAtSize(sub, 11);
      if (y - rowHeight < margin) addExpensePage();
      page.drawText('Subtotal', { x: margin + 20, y, size: 11, font: boldFont });
      page.drawText(sub, { x: width - margin - sw, y, size: 11, font: boldFont });
      y -= rowHeight * 1.5;
    });

  // Member Giving Summary Page
  page = pdfDoc.addPage([width, height]);
  pages.push(page);
  const addGivingPage = () => {
    page = pdfDoc.addPage([width, height]);
    pages.push(page);
    y = drawHeader(
      page,
      'Member Giving Summary',
      churchName,
      rangeStr,
      width,
      height,
      font,
      boldFont,
      margin,
      rowHeight,
    );
  };
  y = drawHeader(
    page,
    'Member Giving Summary',
    churchName,
    rangeStr,
    width,
    height,
    font,
    boldFont,
    margin,
    rowHeight,
  );
  data.memberGiving
    .map(m => ({
      ...m,
      categories: m.categories.filter(c => c.amount !== 0),
    }))
    .filter(m => m.total !== 0 && m.categories.length > 0)
    .forEach(m => {
      if (y - rowHeight < margin) addGivingPage();
      page.drawText(m.member_name, { x: margin, y, size: 12, font: boldFont });
      y -= rowHeight;
      m.categories.forEach(cat => {
        if (y - rowHeight < margin) addGivingPage();
        const label = `- ${cat.category_name}`;
        page.drawText(label, { x: margin + 20, y, size: 11, font });
        const amt = formatAmount(cat.amount);
        const aw = font.widthOfTextAtSize(amt, 11);
        page.drawText(amt, { x: width - margin - aw, y, size: 11, font });
        y -= rowHeight;
      });
      const tot = formatAmount(m.total);
      const twidth = boldFont.widthOfTextAtSize(tot, 11);
      if (y - rowHeight < margin) addGivingPage();
      page.drawText('Total', { x: margin + 20, y, size: 11, font: boldFont });
      page.drawText(tot, { x: width - margin - twidth, y, size: 11, font: boldFont });
      y -= rowHeight * 1.5;
    });

  // Remarks Page
  if (data.remarks) {
    const addRemarksPage = () => {
      page = pdfDoc.addPage([width, height]);
      pages.push(page);
      y = drawHeader(
        page,
        'Treasurer / Pastoral Remarks',
        churchName,
        rangeStr,
        width,
        height,
        font,
        boldFont,
        margin,
        rowHeight,
      );
    };
    addRemarksPage();
    const lines = data.remarks.split(/\n+/);
    lines.forEach(line => {
      if (y - rowHeight < margin) addRemarksPage();
      page.drawText(line, { x: margin, y, size: 12, font });
      y -= rowHeight;
    });
  }

  addFooters(pages, width, margin, font);
  const pdfBytes = await pdfDoc.save(); // Uint8Array containing the PDF data
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}
