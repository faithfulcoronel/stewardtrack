/**
 * Excel Import Data Validator
 *
 * Validates parsed import data for consistency and integrity
 * before processing.
 */

import type {
  ParsedImportData,
  ParsedMember,
  ParsedOpeningBalance,
  ParseError,
} from './parser';

// ============================================================================
// Types
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: ParseError[];
  warnings: string[];
}

export interface CrossReferenceValidation {
  membershipStatusReferences: {
    used: string[];
    missing: string[];
  };
  fundReferences: {
    used: string[];
    missing: string[];
  };
  sourceReferences: {
    used: string[];
    missing: string[];
  };
}

// ============================================================================
// Validation Rules
// ============================================================================

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate date format (YYYY-MM-DD)
 */
function isValidDate(dateStr: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) return false;

  const date = new Date(dateStr);
  return !Number.isNaN(date.getTime());
}

/**
 * Check for duplicate names in an array
 */
function findDuplicates<T extends { name: string }>(items: T[]): string[] {
  const seen = new Set<string>();
  const duplicates: string[] = [];

  for (const item of items) {
    const normalized = item.name.toLowerCase().trim();
    if (seen.has(normalized)) {
      duplicates.push(item.name);
    } else {
      seen.add(normalized);
    }
  }

  return duplicates;
}

// ============================================================================
// Individual Validators
// ============================================================================

/**
 * Validate members data
 */
function validateMembers(members: ParsedMember[]): ParseError[] {
  const errors: ParseError[] = [];

  members.forEach((member, idx) => {
    const row = idx + 2; // Account for header row, 1-indexed

    // Email validation
    if (member.email && !isValidEmail(member.email)) {
      errors.push({
        sheet: 'Members',
        row,
        column: 'Email',
        message: `Invalid email format: ${member.email}`,
      });
    }

    // Birthdate validation
    if (member.birthdate && !isValidDate(member.birthdate)) {
      errors.push({
        sheet: 'Members',
        row,
        column: 'Birthdate',
        message: `Invalid date format: ${member.birthdate}. Expected YYYY-MM-DD`,
      });
    }

    // Future birthdate check
    if (member.birthdate) {
      const birthdate = new Date(member.birthdate);
      const today = new Date();
      if (birthdate > today) {
        errors.push({
          sheet: 'Members',
          row,
          column: 'Birthdate',
          message: 'Birthdate cannot be in the future',
        });
      }
    }
  });

  // Check for duplicate emails
  const emails = members
    .filter(m => m.email)
    .map(m => m.email!.toLowerCase());
  const seenEmails = new Set<string>();
  const duplicateEmails: string[] = [];

  for (const email of emails) {
    if (seenEmails.has(email)) {
      duplicateEmails.push(email);
    } else {
      seenEmails.add(email);
    }
  }

  if (duplicateEmails.length > 0) {
    errors.push({
      sheet: 'Members',
      row: 0,
      message: `Duplicate emails found: ${[...new Set(duplicateEmails)].join(', ')}`,
    });
  }

  return errors;
}

/**
 * Validate membership statuses
 */
function validateMembershipStatuses(statuses: { name: string }[]): ParseError[] {
  const errors: ParseError[] = [];

  const duplicates = findDuplicates(statuses);
  if (duplicates.length > 0) {
    errors.push({
      sheet: 'Membership Status',
      row: 0,
      message: `Duplicate status names found: ${duplicates.join(', ')}`,
    });
  }

  return errors;
}

/**
 * Validate financial sources
 */
function validateFinancialSources(sources: { name: string }[]): ParseError[] {
  const errors: ParseError[] = [];

  const duplicates = findDuplicates(sources);
  if (duplicates.length > 0) {
    errors.push({
      sheet: 'Financial Sources',
      row: 0,
      message: `Duplicate source names found: ${duplicates.join(', ')}`,
    });
  }

  return errors;
}

/**
 * Validate funds
 */
function validateFunds(funds: { name: string; type: string }[]): ParseError[] {
  const errors: ParseError[] = [];

  const duplicates = findDuplicates(funds);
  if (duplicates.length > 0) {
    errors.push({
      sheet: 'Funds',
      row: 0,
      message: `Duplicate fund names found: ${duplicates.join(', ')}`,
    });
  }

  // Validate type values
  funds.forEach((fund, idx) => {
    if (fund.type !== 'restricted' && fund.type !== 'unrestricted') {
      errors.push({
        sheet: 'Funds',
        row: idx + 2,
        column: 'Type',
        message: `Invalid fund type: ${fund.type}. Must be "restricted" or "unrestricted"`,
      });
    }
  });

  return errors;
}

/**
 * Validate generic name categories
 */
function validateNameCategories(
  items: { name: string }[],
  sheetName: string
): ParseError[] {
  const errors: ParseError[] = [];

  const duplicates = findDuplicates(items);
  if (duplicates.length > 0) {
    errors.push({
      sheet: sheetName,
      row: 0,
      message: `Duplicate names found: ${duplicates.join(', ')}`,
    });
  }

  return errors;
}

/**
 * Validate opening balances
 */
function validateOpeningBalances(balances: ParsedOpeningBalance[]): ParseError[] {
  const errors: ParseError[] = [];

  balances.forEach((balance, idx) => {
    const row = idx + 2;

    // Validate date
    if (!isValidDate(balance.as_of_date)) {
      errors.push({
        sheet: 'Opening Balances',
        row,
        column: 'As-of Date',
        message: `Invalid date format: ${balance.as_of_date}. Expected YYYY-MM-DD`,
      });
    }

    // Validate amount is positive
    if (balance.amount < 0) {
      errors.push({
        sheet: 'Opening Balances',
        row,
        column: 'Amount',
        message: 'Amount must be a positive number',
      });
    }
  });

  return errors;
}

// ============================================================================
// Cross-Reference Validation
// ============================================================================

/**
 * Validate cross-references between sheets
 */
export function validateCrossReferences(data: ParsedImportData): CrossReferenceValidation {
  // Get available values from each sheet
  const availableStatuses = new Set(
    data.membershipStatuses.map(s => s.name.toLowerCase())
  );
  const availableFunds = new Set(
    data.funds.map(f => f.name.toLowerCase())
  );
  const availableSources = new Set(
    data.financialSources.map(s => s.name.toLowerCase())
  );

  // Collect referenced values from members
  const usedStatuses = new Set<string>();
  for (const member of data.members) {
    if (member.membership_status) {
      usedStatuses.add(member.membership_status.toLowerCase());
    }
  }

  // Collect referenced values from opening balances
  const usedFunds = new Set<string>();
  const usedSources = new Set<string>();
  for (const balance of data.openingBalances) {
    usedFunds.add(balance.fund_name.toLowerCase());
    usedSources.add(balance.financial_source.toLowerCase());
  }

  // Find missing references
  const missingStatuses: string[] = [];
  for (const status of usedStatuses) {
    if (!availableStatuses.has(status)) {
      missingStatuses.push(status);
    }
  }

  const missingFunds: string[] = [];
  for (const fund of usedFunds) {
    if (!availableFunds.has(fund)) {
      missingFunds.push(fund);
    }
  }

  const missingSources: string[] = [];
  for (const source of usedSources) {
    if (!availableSources.has(source)) {
      missingSources.push(source);
    }
  }

  return {
    membershipStatusReferences: {
      used: [...usedStatuses],
      missing: missingStatuses,
    },
    fundReferences: {
      used: [...usedFunds],
      missing: missingFunds,
    },
    sourceReferences: {
      used: [...usedSources],
      missing: missingSources,
    },
  };
}

// ============================================================================
// Main Validator
// ============================================================================

/**
 * Validate all parsed import data
 */
export function validateImportData(data: ParsedImportData): ValidationResult {
  const errors: ParseError[] = [];
  const warnings: string[] = [];

  // Validate individual sheets
  errors.push(...validateMembers(data.members));
  errors.push(...validateMembershipStatuses(data.membershipStatuses));
  errors.push(...validateFinancialSources(data.financialSources));
  errors.push(...validateFunds(data.funds));
  errors.push(...validateNameCategories(data.incomeCategories, 'Income Categories'));
  errors.push(...validateNameCategories(data.expenseCategories, 'Expense Categories'));
  errors.push(...validateNameCategories(data.budgetCategories, 'Budget Categories'));
  errors.push(...validateOpeningBalances(data.openingBalances));

  // Validate cross-references
  const crossRef = validateCrossReferences(data);

  if (crossRef.membershipStatusReferences.missing.length > 0) {
    errors.push({
      sheet: 'Members',
      row: 0,
      message: `Membership statuses referenced but not defined: ${crossRef.membershipStatusReferences.missing.join(', ')}`,
    });
  }

  if (crossRef.fundReferences.missing.length > 0) {
    errors.push({
      sheet: 'Opening Balances',
      row: 0,
      message: `Funds referenced but not defined: ${crossRef.fundReferences.missing.join(', ')}`,
    });
  }

  if (crossRef.sourceReferences.missing.length > 0) {
    errors.push({
      sheet: 'Opening Balances',
      row: 0,
      message: `Financial Sources referenced but not defined: ${crossRef.sourceReferences.missing.join(', ')}`,
    });
  }

  // Add warnings for potential issues
  if (data.members.length > 0 && data.membershipStatuses.length === 0) {
    warnings.push('No membership statuses defined. Default statuses will be used.');
  }

  if (data.openingBalances.length > 0) {
    if (data.funds.length === 0) {
      warnings.push('Opening balances defined but no funds specified. Balances will be skipped.');
    }
    if (data.financialSources.length === 0) {
      warnings.push('Opening balances defined but no financial sources specified. Balances will be skipped.');
    }
  }

  // Check for reasonable data limits
  if (data.members.length > 5000) {
    warnings.push(`Large number of members (${data.members.length}). Import may take some time.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Quick validation check (for preview)
 */
export function quickValidate(data: ParsedImportData): {
  hasErrors: boolean;
  errorCount: number;
  summary: string;
} {
  const result = validateImportData(data);

  let summary = '';
  if (result.isValid) {
    summary = 'Data looks good! Ready to import.';
  } else {
    summary = `Found ${result.errors.length} error(s) that need to be fixed before import.`;
  }

  return {
    hasErrors: !result.isValid,
    errorCount: result.errors.length,
    summary,
  };
}
