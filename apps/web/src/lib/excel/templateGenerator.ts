/**
 * Excel Template Generator for Onboarding Import
 *
 * Generates a sample Excel workbook with multiple sheets for:
 * - Membership Status (with defaults)
 * - Financial Sources
 * - Funds
 * - Income Categories
 * - Expense Categories
 * - Budget Categories
 * - Opening Balances
 *
 * Note: Members are imported separately via the Members module.
 */

import * as XLSX from 'xlsx';

// ============================================================================
// Types
// ============================================================================

export interface TemplateSheet {
  name: string;
  headers: string[];
  sampleData: (string | number | null)[][];
  notes?: string[];
  columnWidths?: number[];
}

// ============================================================================
// Default Data
// ============================================================================

const DEFAULT_MEMBERSHIP_STATUSES = [
  { name: 'Active', description: 'Regular attending member' },
  { name: 'Inactive', description: 'Member who is no longer attending' },
  { name: 'Visitor', description: 'First-time or occasional visitor' },
  { name: 'New Member', description: 'Recently joined the church' },
  { name: 'Transferred', description: 'Transferred to another church' },
  { name: 'Deceased', description: 'Member who has passed away' },
];

const SAMPLE_FINANCIAL_SOURCES = [
  { name: 'Main Bank Account', description: 'Primary checking account for church operations', source_type: 'bank' },
  { name: 'Petty Cash', description: 'Small cash fund for minor expenses', source_type: 'cash' },
  { name: 'Online Giving', description: 'Digital giving platform account', source_type: 'online' },
];

const SAMPLE_FUNDS = [
  { name: 'General Fund', description: 'Main operating fund for church activities', type: 'unrestricted' },
  { name: 'Building Fund', description: 'Designated for building maintenance and construction', type: 'restricted' },
  { name: 'Mission Fund', description: 'Designated for mission trips and outreach', type: 'restricted' },
];

const SAMPLE_INCOME_CATEGORIES = [
  { name: 'Tithes', description: '10% giving from members' },
  { name: 'Offerings', description: 'General giving beyond tithes' },
  { name: 'Donations', description: 'One-time or special gifts' },
  { name: 'Events', description: 'Income from church events' },
];

const SAMPLE_EXPENSE_CATEGORIES = [
  { name: 'Salaries', description: 'Staff compensation and benefits' },
  { name: 'Utilities', description: 'Electricity, water, gas, internet' },
  { name: 'Maintenance', description: 'Building and equipment maintenance' },
  { name: 'Events', description: 'Event-related expenses' },
  { name: 'Supplies', description: 'Office and ministry supplies' },
];

const SAMPLE_BUDGET_CATEGORIES = [
  { name: 'Personnel', description: 'All staff-related expenses' },
  { name: 'Facilities', description: 'Building and grounds' },
  { name: 'Ministry Programs', description: 'Program-specific budgets' },
  { name: 'Administration', description: 'Administrative costs' },
  { name: 'Outreach', description: 'Community and mission work' },
];

// ============================================================================
// Sheet Definitions
// ============================================================================

function getMembersSheet(): TemplateSheet {
  return {
    name: 'Members',
    headers: [
      'First Name',
      'Middle Name',
      'Last Name',
      'Email',
      'Contact Number',
      'Street Address',
      'City',
      'State/Province',
      'Postal Code',
      'Country',
      'Birthdate (YYYY-MM-DD)',
      'Membership Status',
    ],
    sampleData: [
      ['John', 'Paul', 'Smith', 'john.smith@email.com', '+1-555-123-4567', '123 Main St', 'Springfield', 'IL', '62701', 'USA', '1985-03-15', 'Active'],
      ['Mary', null, 'Johnson', 'mary.j@email.com', '+1-555-234-5678', '456 Oak Ave', 'Springfield', 'IL', '62702', 'USA', '1990-07-22', 'Active'],
      ['James', 'Robert', 'Williams', 'james.w@email.com', '+1-555-345-6789', '789 Pine Rd', 'Springfield', 'IL', '62703', 'USA', '1978-11-08', 'New Member'],
    ],
    notes: [
      'Required fields: First Name, Last Name',
      'Birthdate format: YYYY-MM-DD (e.g., 1985-03-15)',
      'Membership Status must match a value from the Membership Status sheet',
    ],
    columnWidths: [15, 15, 15, 25, 18, 25, 15, 15, 12, 10, 20, 18],
  };
}

function getMembershipStatusSheet(): TemplateSheet {
  return {
    name: 'Membership Status',
    headers: ['Name', 'Description'],
    sampleData: DEFAULT_MEMBERSHIP_STATUSES.map(status => [status.name, status.description]),
    notes: [
      'These are default membership statuses. You can modify or add more.',
      'The Name field must be unique.',
      'These statuses are referenced by the Members sheet.',
    ],
    columnWidths: [20, 50],
  };
}

function getFinancialSourcesSheet(): TemplateSheet {
  return {
    name: 'Financial Sources',
    headers: ['Name', 'Description', 'Source Type'],
    sampleData: SAMPLE_FINANCIAL_SOURCES.map(source => [source.name, source.description, source.source_type]),
    notes: [
      'Financial sources represent where money is held (bank accounts, cash, etc.)',
      'The Name field is required and must be unique.',
      'Source Type must be one of: bank, cash, online, wallet, fund, other',
      'These will be linked to Asset accounts in your Chart of Accounts.',
    ],
    columnWidths: [25, 50, 15],
  };
}

function getFundsSheet(): TemplateSheet {
  return {
    name: 'Funds',
    headers: ['Name', 'Description', 'Type (restricted/unrestricted)'],
    sampleData: SAMPLE_FUNDS.map(fund => [fund.name, fund.description, fund.type]),
    notes: [
      'Funds are designations for how money can be used.',
      'Restricted funds have specific purposes (e.g., Building Fund).',
      'Unrestricted funds can be used for general operations.',
      'Type must be either "restricted" or "unrestricted".',
      'These will be linked to Equity accounts in your Chart of Accounts.',
    ],
    columnWidths: [20, 50, 25],
  };
}

function getIncomeCategoriesSheet(): TemplateSheet {
  return {
    name: 'Income Categories',
    headers: ['Name', 'Description'],
    sampleData: SAMPLE_INCOME_CATEGORIES.map(cat => [cat.name, cat.description]),
    notes: [
      'Income categories track different types of revenue.',
      'The Name field is required and must be unique.',
      'These will be linked to Revenue accounts in your Chart of Accounts.',
    ],
    columnWidths: [20, 50],
  };
}

function getExpenseCategoriesSheet(): TemplateSheet {
  return {
    name: 'Expense Categories',
    headers: ['Name', 'Description'],
    sampleData: SAMPLE_EXPENSE_CATEGORIES.map(cat => [cat.name, cat.description]),
    notes: [
      'Expense categories track different types of spending.',
      'The Name field is required and must be unique.',
      'These will be linked to Expense accounts in your Chart of Accounts.',
    ],
    columnWidths: [20, 50],
  };
}

function getBudgetCategoriesSheet(): TemplateSheet {
  return {
    name: 'Budget Categories',
    headers: ['Name', 'Description'],
    sampleData: SAMPLE_BUDGET_CATEGORIES.map(cat => [cat.name, cat.description]),
    notes: [
      'Budget categories help organize your budgeting process.',
      'The Name field is required and must be unique.',
    ],
    columnWidths: [20, 50],
  };
}

function getOpeningBalancesSheet(): TemplateSheet {
  const currentDate = new Date().toISOString().split('T')[0];
  return {
    name: 'Opening Balances',
    headers: ['Fund Name', 'Financial Source', 'Amount', 'As-of Date (YYYY-MM-DD)'],
    sampleData: [
      ['General Fund', 'Main Bank Account', 50000, currentDate],
      ['Building Fund', 'Main Bank Account', 25000, currentDate],
      ['Mission Fund', 'Main Bank Account', 10000, currentDate],
      ['General Fund', 'Petty Cash', 500, currentDate],
    ],
    notes: [
      'Opening balances set your starting financial position.',
      'Fund Name must match a fund from the Funds sheet.',
      'Financial Source must match a source from the Financial Sources sheet.',
      'Amount should be a positive number.',
      'As-of Date format: YYYY-MM-DD (e.g., 2024-01-01)',
      'The system will create proper double-entry journal entries:',
      '  - DEBIT: Asset account (linked to Financial Source)',
      '  - CREDIT: Equity account (linked to Fund)',
    ],
    columnWidths: [20, 25, 15, 25],
  };
}

// ============================================================================
// Template Generation
// ============================================================================

/**
 * Generate all sheet definitions for the onboarding template
 * Note: Members sheet is excluded - members are imported via the Members module
 */
export function getTemplateSheets(): TemplateSheet[] {
  return [
    getMembershipStatusSheet(),
    getFinancialSourcesSheet(),
    getFundsSheet(),
    getIncomeCategoriesSheet(),
    getExpenseCategoriesSheet(),
    getBudgetCategoriesSheet(),
    getOpeningBalancesSheet(),
  ];
}

/**
 * Create worksheet from sheet definition
 */
function createWorksheet(sheet: TemplateSheet): XLSX.WorkSheet {
  const data: (string | number | null)[][] = [];

  // Add notes as header rows (will be styled differently)
  if (sheet.notes && sheet.notes.length > 0) {
    for (const note of sheet.notes) {
      data.push([`📝 ${note}`]);
    }
    data.push([]); // Empty row separator
  }

  // Add headers
  data.push(sheet.headers);

  // Add sample data
  for (const row of sheet.sampleData) {
    data.push(row);
  }

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  if (sheet.columnWidths) {
    worksheet['!cols'] = sheet.columnWidths.map(width => ({ wch: width }));
  }

  // Merge cells for notes (full row width)
  if (sheet.notes && sheet.notes.length > 0) {
    const merges: XLSX.Range[] = [];
    for (let i = 0; i < sheet.notes.length; i++) {
      merges.push({
        s: { r: i, c: 0 },
        e: { r: i, c: sheet.headers.length - 1 },
      });
    }
    worksheet['!merges'] = merges;
  }

  return worksheet;
}

/**
 * Generate the complete onboarding import template workbook
 */
export function generateOnboardingTemplate(): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();
  const sheets = getTemplateSheets();

  for (const sheet of sheets) {
    const worksheet = createWorksheet(sheet);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  }

  return workbook;
}

/**
 * Generate template and return as buffer (for API endpoint)
 */
export function generateTemplateBuffer(): Buffer {
  const workbook = generateOnboardingTemplate();
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/**
 * Generate template and trigger download (for client-side)
 */
export function downloadOnboardingTemplate(): void {
  const workbook = generateOnboardingTemplate();
  const filename = `stewardtrack-import-template-${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * Get template sheet names for reference
 */
export function getTemplateSheetNames(): string[] {
  return getTemplateSheets().map(sheet => sheet.name);
}

/**
 * Get default membership statuses (for pre-populating if user doesn't import any)
 */
export function getDefaultMembershipStatuses(): { name: string; description: string }[] {
  return [...DEFAULT_MEMBERSHIP_STATUSES];
}
