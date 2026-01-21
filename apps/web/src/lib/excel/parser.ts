/**
 * Excel Parser for Onboarding Import
 *
 * Parses uploaded Excel files and extracts data from each sheet,
 * mapping to the expected import format.
 */

import * as XLSX from 'xlsx';

// ============================================================================
// Types
// ============================================================================

export interface ParsedMember {
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  email?: string | null;
  contact_number?: string | null;
  street_address?: string | null;
  city?: string | null;
  state_province?: string | null;
  postal_code?: string | null;
  country?: string | null;
  birthdate?: string | null;
  membership_status?: string | null;
}

export interface ParsedMembershipStatus {
  name: string;
  description?: string | null;
}

export interface ParsedFinancialSource {
  name: string;
  description?: string | null;
  source_type?: 'bank' | 'cash' | 'online' | 'wallet' | 'fund' | 'other' | null;
}

export interface ParsedFund {
  name: string;
  description?: string | null;
  type: 'restricted' | 'unrestricted';
}

export interface ParsedIncomeCategory {
  name: string;
  description?: string | null;
}

export interface ParsedExpenseCategory {
  name: string;
  description?: string | null;
}

export interface ParsedBudgetCategory {
  name: string;
  description?: string | null;
}

export interface ParsedOpeningBalance {
  fund_name: string;
  financial_source: string;
  amount: number;
  as_of_date: string;
}

export interface ParsedImportData {
  members: ParsedMember[];
  membershipStatuses: ParsedMembershipStatus[];
  financialSources: ParsedFinancialSource[];
  funds: ParsedFund[];
  incomeCategories: ParsedIncomeCategory[];
  expenseCategories: ParsedExpenseCategory[];
  budgetCategories: ParsedBudgetCategory[];
  openingBalances: ParsedOpeningBalance[];
}

export interface ParseError {
  sheet: string;
  row: number;
  column?: string;
  message: string;
}

export interface ParseResult {
  success: boolean;
  data: ParsedImportData | null;
  errors: ParseError[];
  warnings: string[];
}

// ============================================================================
// Header Mappings (normalize different header formats)
// ============================================================================

const MEMBER_HEADER_MAP: Record<string, keyof ParsedMember> = {
  'first name': 'first_name',
  'firstname': 'first_name',
  'first': 'first_name',
  'middle name': 'middle_name',
  'middlename': 'middle_name',
  'middle': 'middle_name',
  'last name': 'last_name',
  'lastname': 'last_name',
  'last': 'last_name',
  'surname': 'last_name',
  'email': 'email',
  'email address': 'email',
  'contact number': 'contact_number',
  'phone': 'contact_number',
  'phone number': 'contact_number',
  'mobile': 'contact_number',
  'telephone': 'contact_number',
  'street address': 'street_address',
  'street': 'street_address',
  'address': 'street_address',
  'city': 'city',
  'state/province': 'state_province',
  'state': 'state_province',
  'province': 'state_province',
  'postal code': 'postal_code',
  'zip': 'postal_code',
  'zip code': 'postal_code',
  'postcode': 'postal_code',
  'country': 'country',
  'birthdate (yyyy-mm-dd)': 'birthdate',
  'birthdate': 'birthdate',
  'birthday': 'birthdate',
  'date of birth': 'birthdate',
  'dob': 'birthdate',
  'membership status': 'membership_status',
  'status': 'membership_status',
};

// ============================================================================
// Parsing Functions
// ============================================================================

/**
 * Normalize header text for mapping
 */
function normalizeHeader(header: string): string {
  return header.toLowerCase().trim();
}

/**
 * Get cell value as string or null
 */
function getCellString(value: unknown): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return String(value).trim();
}

/**
 * Get cell value as number or null
 */
function getCellNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

/**
 * Parse date from various formats
 */
function parseDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  // Handle Excel date serial numbers
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      const y = date.y;
      const m = String(date.m).padStart(2, '0');
      const d = String(date.d).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  // Handle string dates
  const strValue = String(value).trim();

  // Try ISO format (YYYY-MM-DD)
  const isoMatch = strValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Try US format (MM/DD/YYYY)
  const usMatch = strValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, m, d, y] = usMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Try to parse as Date
  const date = new Date(strValue);
  if (!Number.isNaN(date.getTime())) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return null;
}

/**
 * Find header row in sheet data (skip note rows)
 */
function findHeaderRow(data: unknown[][]): number {
  for (let i = 0; i < Math.min(data.length, 10); i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    // Check if first cell starts with note emoji or has multiple non-empty cells
    const firstCell = String(row[0] || '').trim();
    if (firstCell.startsWith('📝')) continue;

    // If we have multiple non-empty cells, this is likely the header
    const nonEmptyCells = row.filter(cell => cell !== null && cell !== undefined && cell !== '');
    if (nonEmptyCells.length >= 2) {
      return i;
    }
  }
  return 0;
}

/**
 * Parse Members sheet
 */
function parseMembers(worksheet: XLSX.WorkSheet): { data: ParsedMember[]; errors: ParseError[] } {
  const data: ParsedMember[] = [];
  const errors: ParseError[] = [];

  const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
  if (sheetData.length === 0) return { data, errors };

  const headerRowIdx = findHeaderRow(sheetData);
  const headerRow = sheetData[headerRowIdx] as string[];
  if (!headerRow) return { data, errors };

  // Map column indices to member fields
  const columnMap: Record<number, keyof ParsedMember> = {};
  headerRow.forEach((header, idx) => {
    if (!header) return;
    const normalized = normalizeHeader(String(header));
    const field = MEMBER_HEADER_MAP[normalized];
    if (field) {
      columnMap[idx] = field;
    }
  });

  // Parse data rows
  for (let i = headerRowIdx + 1; i < sheetData.length; i++) {
    const row = sheetData[i] as unknown[];
    if (!row || row.every(cell => cell === null || cell === undefined || cell === '')) {
      continue; // Skip empty rows
    }

    const member: Partial<ParsedMember> = {};

    for (const [colIdx, field] of Object.entries(columnMap)) {
      const value = row[Number(colIdx)];

      if (field === 'birthdate') {
        member[field] = parseDate(value);
      } else {
        // Type assertion needed because Partial makes optional fields allow undefined
        (member as Record<string, string | null>)[field] = getCellString(value);
      }
    }

    // Validate required fields
    if (!member.first_name) {
      errors.push({
        sheet: 'Members',
        row: i + 1,
        column: 'First Name',
        message: 'First Name is required',
      });
      continue;
    }
    if (!member.last_name) {
      errors.push({
        sheet: 'Members',
        row: i + 1,
        column: 'Last Name',
        message: 'Last Name is required',
      });
      continue;
    }

    data.push(member as ParsedMember);
  }

  return { data, errors };
}

/**
 * Parse simple name/description sheets (Membership Status, Categories, etc.)
 */
function parseNameDescriptionSheet<T extends { name: string; description?: string | null }>(
  worksheet: XLSX.WorkSheet,
  sheetName: string,
  createItem: (name: string, description: string | null) => T
): { data: T[]; errors: ParseError[] } {
  const data: T[] = [];
  const errors: ParseError[] = [];

  const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
  if (sheetData.length === 0) return { data, errors };

  const headerRowIdx = findHeaderRow(sheetData);
  const headerRow = sheetData[headerRowIdx] as string[];
  if (!headerRow) return { data, errors };

  // Find name and description columns
  let nameIdx = -1;
  let descIdx = -1;

  headerRow.forEach((header, idx) => {
    if (!header) return;
    const normalized = normalizeHeader(String(header));
    if (normalized === 'name' || normalized.includes('name')) {
      nameIdx = idx;
    } else if (normalized === 'description' || normalized.includes('description') || normalized.includes('purpose')) {
      descIdx = idx;
    }
  });

  if (nameIdx === -1) {
    errors.push({
      sheet: sheetName,
      row: headerRowIdx + 1,
      message: 'Could not find Name column',
    });
    return { data, errors };
  }

  // Parse data rows
  for (let i = headerRowIdx + 1; i < sheetData.length; i++) {
    const row = sheetData[i] as unknown[];
    if (!row || row.every(cell => cell === null || cell === undefined || cell === '')) {
      continue;
    }

    const name = getCellString(row[nameIdx]);
    if (!name) {
      continue; // Skip rows without name
    }

    const description = descIdx >= 0 ? getCellString(row[descIdx]) : null;
    data.push(createItem(name, description));
  }

  return { data, errors };
}

/**
 * Parse Funds sheet (with type column)
 */
function parseFunds(worksheet: XLSX.WorkSheet): { data: ParsedFund[]; errors: ParseError[] } {
  const data: ParsedFund[] = [];
  const errors: ParseError[] = [];

  const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
  if (sheetData.length === 0) return { data, errors };

  const headerRowIdx = findHeaderRow(sheetData);
  const headerRow = sheetData[headerRowIdx] as string[];
  if (!headerRow) return { data, errors };

  // Find columns
  let nameIdx = -1;
  let descIdx = -1;
  let typeIdx = -1;

  headerRow.forEach((header, idx) => {
    if (!header) return;
    const normalized = normalizeHeader(String(header));
    if ((normalized === 'name' || normalized.includes('name')) && !normalized.includes('type')) {
      nameIdx = idx;
    } else if (normalized.includes('description') || normalized.includes('purpose')) {
      descIdx = idx;
    } else if (normalized.includes('type')) {
      typeIdx = idx;
    }
  });

  if (nameIdx === -1) {
    errors.push({
      sheet: 'Funds',
      row: headerRowIdx + 1,
      message: 'Could not find Name column',
    });
    return { data, errors };
  }

  // Parse data rows
  for (let i = headerRowIdx + 1; i < sheetData.length; i++) {
    const row = sheetData[i] as unknown[];
    if (!row || row.every(cell => cell === null || cell === undefined || cell === '')) {
      continue;
    }

    const name = getCellString(row[nameIdx]);
    if (!name) {
      continue;
    }

    const description = descIdx >= 0 ? getCellString(row[descIdx]) : null;
    const typeValue = typeIdx >= 0 ? getCellString(row[typeIdx])?.toLowerCase() : 'unrestricted';
    const type: 'restricted' | 'unrestricted' = typeValue === 'restricted' ? 'restricted' : 'unrestricted';

    data.push({ name, description, type });
  }

  return { data, errors };
}

/**
 * Parse Financial Sources sheet (with source_type column)
 */
function parseFinancialSources(worksheet: XLSX.WorkSheet): { data: ParsedFinancialSource[]; errors: ParseError[] } {
  const data: ParsedFinancialSource[] = [];
  const errors: ParseError[] = [];

  const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
  if (sheetData.length === 0) return { data, errors };

  const headerRowIdx = findHeaderRow(sheetData);
  const headerRow = sheetData[headerRowIdx] as string[];
  if (!headerRow) return { data, errors };

  // Find columns
  let nameIdx = -1;
  let descIdx = -1;
  let typeIdx = -1;

  headerRow.forEach((header, idx) => {
    if (!header) return;
    const normalized = normalizeHeader(String(header));
    if ((normalized === 'name' || normalized.includes('name')) && !normalized.includes('type')) {
      nameIdx = idx;
    } else if (normalized.includes('description') || normalized.includes('purpose')) {
      descIdx = idx;
    } else if (normalized.includes('source type') || normalized === 'sourcetype' || normalized === 'type') {
      typeIdx = idx;
    }
  });

  if (nameIdx === -1) {
    errors.push({
      sheet: 'Financial Sources',
      row: headerRowIdx + 1,
      message: 'Could not find Name column',
    });
    return { data, errors };
  }

  const validSourceTypes = ['bank', 'cash', 'online', 'wallet', 'fund', 'other'];

  // Parse data rows
  for (let i = headerRowIdx + 1; i < sheetData.length; i++) {
    const row = sheetData[i] as unknown[];
    if (!row || row.every(cell => cell === null || cell === undefined || cell === '')) {
      continue;
    }

    const name = getCellString(row[nameIdx]);
    if (!name) {
      continue;
    }

    const description = descIdx >= 0 ? getCellString(row[descIdx]) : null;
    let sourceType: ParsedFinancialSource['source_type'] = null;

    if (typeIdx >= 0) {
      const typeValue = getCellString(row[typeIdx])?.toLowerCase();
      if (typeValue && validSourceTypes.includes(typeValue)) {
        sourceType = typeValue as ParsedFinancialSource['source_type'];
      }
    }

    data.push({ name, description, source_type: sourceType });
  }

  return { data, errors };
}

/**
 * Parse Opening Balances sheet
 */
function parseOpeningBalances(worksheet: XLSX.WorkSheet): { data: ParsedOpeningBalance[]; errors: ParseError[] } {
  const data: ParsedOpeningBalance[] = [];
  const errors: ParseError[] = [];

  const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
  if (sheetData.length === 0) return { data, errors };

  const headerRowIdx = findHeaderRow(sheetData);
  const headerRow = sheetData[headerRowIdx] as string[];
  if (!headerRow) return { data, errors };

  // Find columns
  let fundIdx = -1;
  let sourceIdx = -1;
  let amountIdx = -1;
  let dateIdx = -1;

  headerRow.forEach((header, idx) => {
    if (!header) return;
    const normalized = normalizeHeader(String(header));
    if (normalized.includes('fund')) {
      fundIdx = idx;
    } else if (normalized.includes('source') || normalized.includes('financial')) {
      sourceIdx = idx;
    } else if (normalized.includes('amount')) {
      amountIdx = idx;
    } else if (normalized.includes('date') || normalized.includes('as-of') || normalized.includes('as of')) {
      dateIdx = idx;
    }
  });

  const missingCols: string[] = [];
  if (fundIdx === -1) missingCols.push('Fund Name');
  if (sourceIdx === -1) missingCols.push('Financial Source');
  if (amountIdx === -1) missingCols.push('Amount');
  if (dateIdx === -1) missingCols.push('As-of Date');

  if (missingCols.length > 0) {
    errors.push({
      sheet: 'Opening Balances',
      row: headerRowIdx + 1,
      message: `Could not find columns: ${missingCols.join(', ')}`,
    });
    return { data, errors };
  }

  // Parse data rows
  for (let i = headerRowIdx + 1; i < sheetData.length; i++) {
    const row = sheetData[i] as unknown[];
    if (!row || row.every(cell => cell === null || cell === undefined || cell === '')) {
      continue;
    }

    const fundName = getCellString(row[fundIdx]);
    const source = getCellString(row[sourceIdx]);
    const amount = getCellNumber(row[amountIdx]);
    const asOfDate = parseDate(row[dateIdx]);

    if (!fundName) {
      errors.push({
        sheet: 'Opening Balances',
        row: i + 1,
        column: 'Fund Name',
        message: 'Fund Name is required',
      });
      continue;
    }
    if (!source) {
      errors.push({
        sheet: 'Opening Balances',
        row: i + 1,
        column: 'Financial Source',
        message: 'Financial Source is required',
      });
      continue;
    }
    if (amount === null || amount < 0) {
      errors.push({
        sheet: 'Opening Balances',
        row: i + 1,
        column: 'Amount',
        message: 'Amount must be a positive number',
      });
      continue;
    }
    if (!asOfDate) {
      errors.push({
        sheet: 'Opening Balances',
        row: i + 1,
        column: 'As-of Date',
        message: 'As-of Date is required and must be a valid date',
      });
      continue;
    }

    data.push({
      fund_name: fundName,
      financial_source: source,
      amount,
      as_of_date: asOfDate,
    });
  }

  return { data, errors };
}

// ============================================================================
// Main Parser
// ============================================================================

/**
 * Parse an uploaded Excel file
 * @param buffer - File buffer or ArrayBuffer
 */
export function parseImportFile(buffer: ArrayBuffer | Buffer): ParseResult {
  const errors: ParseError[] = [];
  const warnings: string[] = [];

  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetNames = workbook.SheetNames;

    // Initialize empty data
    const data: ParsedImportData = {
      members: [],
      membershipStatuses: [],
      financialSources: [],
      funds: [],
      incomeCategories: [],
      expenseCategories: [],
      budgetCategories: [],
      openingBalances: [],
    };

    // Parse each sheet
    for (const sheetName of sheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const normalizedName = sheetName.toLowerCase().replace(/\s+/g, '');

      if (normalizedName === 'members') {
        const result = parseMembers(worksheet);
        data.members = result.data;
        errors.push(...result.errors);
      } else if (normalizedName === 'membershipstatus') {
        const result = parseNameDescriptionSheet(
          worksheet,
          'Membership Status',
          (name, description) => ({ name, description })
        );
        data.membershipStatuses = result.data;
        errors.push(...result.errors);
      } else if (normalizedName === 'financialsources') {
        const result = parseFinancialSources(worksheet);
        data.financialSources = result.data;
        errors.push(...result.errors);
      } else if (normalizedName === 'funds') {
        const result = parseFunds(worksheet);
        data.funds = result.data;
        errors.push(...result.errors);
      } else if (normalizedName === 'incomecategories') {
        const result = parseNameDescriptionSheet(
          worksheet,
          'Income Categories',
          (name, description) => ({ name, description })
        );
        data.incomeCategories = result.data;
        errors.push(...result.errors);
      } else if (normalizedName === 'expensecategories') {
        const result = parseNameDescriptionSheet(
          worksheet,
          'Expense Categories',
          (name, description) => ({ name, description })
        );
        data.expenseCategories = result.data;
        errors.push(...result.errors);
      } else if (normalizedName === 'budgetcategories') {
        const result = parseNameDescriptionSheet(
          worksheet,
          'Budget Categories',
          (name, description) => ({ name, description })
        );
        data.budgetCategories = result.data;
        errors.push(...result.errors);
      } else if (normalizedName === 'openingbalances') {
        const result = parseOpeningBalances(worksheet);
        data.openingBalances = result.data;
        errors.push(...result.errors);
      } else {
        warnings.push(`Unknown sheet "${sheetName}" was ignored`);
      }
    }

    // Note: Members are imported separately via the Members module
    // No warning needed for empty members sheet

    return {
      success: errors.length === 0,
      data,
      errors,
      warnings,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      errors: [{
        sheet: 'File',
        row: 0,
        message: `Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      warnings: [],
    };
  }
}

/**
 * Get summary statistics from parsed data
 */
export function getImportSummary(data: ParsedImportData): Record<string, number> {
  return {
    members: data.members.length,
    membershipStatuses: data.membershipStatuses.length,
    financialSources: data.financialSources.length,
    funds: data.funds.length,
    incomeCategories: data.incomeCategories.length,
    expenseCategories: data.expenseCategories.length,
    budgetCategories: data.budgetCategories.length,
    openingBalances: data.openingBalances.length,
  };
}
