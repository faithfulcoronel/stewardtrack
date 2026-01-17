/**
 * Excel Import/Export Utilities
 *
 * Re-exports all Excel-related functionality for onboarding import.
 */

// Template generation
export {
  generateOnboardingTemplate,
  generateTemplateBuffer,
  downloadOnboardingTemplate,
  getTemplateSheetNames,
  getDefaultMembershipStatuses,
  getTemplateSheets,
  type TemplateSheet,
} from './templateGenerator';

// Parsing
export {
  parseImportFile,
  getImportSummary,
  type ParsedMember,
  type ParsedMembershipStatus,
  type ParsedFinancialSource,
  type ParsedFund,
  type ParsedIncomeCategory,
  type ParsedExpenseCategory,
  type ParsedBudgetCategory,
  type ParsedOpeningBalance,
  type ParsedImportData,
  type ParseError,
  type ParseResult,
} from './parser';

// Validation
export {
  validateImportData,
  validateCrossReferences,
  quickValidate,
  type ValidationResult,
  type CrossReferenceValidation,
} from './validator';
