/**
 * Reusable Excel Import Framework - Types
 *
 * This module provides common types for server-side Excel import operations.
 * Use these types when building entity-specific import services.
 */

// =============================================================================
// Column Definition Types
// =============================================================================

/**
 * Defines a column in the import template
 */
export interface ExcelColumnDefinition<TField extends string = string> {
  /** The field name in the data model */
  field: TField;
  /** Display header in the Excel template */
  header: string;
  /** Whether this field is required */
  required: boolean;
  /** Data type for validation */
  type: "string" | "number" | "date" | "email" | "boolean" | "lookup";
  /** Width in Excel (optional, defaults to 15) */
  width?: number;
  /** Help text shown in template instructions */
  description?: string;
  /** For lookup types: the valid values */
  lookupValues?: string[];
  /** Custom validation function (optional) */
  validate?: (value: unknown) => ValidationResult;
}

/**
 * Result of a validation check
 */
export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

// =============================================================================
// Parse Result Types
// =============================================================================

/**
 * Error found during parsing or validation
 */
export interface ImportError {
  /** The sheet name where error occurred */
  sheet: string;
  /** 1-indexed row number (includes header) */
  row: number;
  /** Field/column name */
  field: string;
  /** Human-readable error message */
  message: string;
}

/**
 * A single row parsed from the Excel file
 */
export interface ParsedRow<T> {
  /** 1-indexed row number (includes header) */
  rowNumber: number;
  /** The parsed data (may have null/undefined fields) */
  data: Partial<T>;
  /** Whether all validations passed */
  isValid: boolean;
  /** Errors specific to this row */
  errors: ImportError[];
}

/**
 * Complete result of parsing an Excel file
 */
export interface ParseResult<T> {
  /** All parsed rows */
  rows: ParsedRow<T>[];
  /** Total number of data rows (excluding header) */
  totalRows: number;
  /** Number of valid rows */
  validRows: number;
  /** Number of invalid rows */
  invalidRows: number;
  /** All errors collected */
  errors: ImportError[];
}

// =============================================================================
// Preview Types
// =============================================================================

/**
 * Preview result returned to the client before actual import
 */
export interface PreviewResult<TPreview = unknown> {
  success: boolean;
  preview: true;
  data: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
  };
  errors: ImportError[];
  /** Preview data (subset of valid rows for display) */
  validItems: TPreview[];
}

// =============================================================================
// Import Types
// =============================================================================

/**
 * Data to be sent for batch import
 */
export interface ImportData<T> {
  items: T[];
}

/**
 * Result of the actual import operation
 */
export interface ImportResult {
  success: boolean;
  data?: {
    imported_count: number;
    error_count: number;
    errors?: Array<{
      row?: number;
      field?: string;
      message: string;
    }>;
  };
  message?: string;
  error?: string;
}

// =============================================================================
// Template Types
// =============================================================================

/**
 * Configuration for generating the Excel template
 */
export interface TemplateConfig<TField extends string = string> {
  /** Sheet name for the data */
  sheetName: string;
  /** Column definitions */
  columns: ExcelColumnDefinition<TField>[];
  /** Whether to include an instructions sheet */
  includeInstructions?: boolean;
  /** Custom instructions text (markdown supported) */
  instructionsText?: string;
  /** Example rows to include in template */
  exampleRows?: Array<Record<TField, unknown>>;
}

// =============================================================================
// Service Configuration Types
// =============================================================================

/**
 * Configuration for an Excel import service
 */
export interface ExcelImportServiceConfig<
  TRow,
  TField extends string = string
> {
  /** Entity name (for messages and sheet names) */
  entityName: string;
  /** Plural entity name */
  entityNamePlural: string;
  /** Template configuration */
  template: TemplateConfig<TField>;
  /** Maximum rows allowed per import */
  maxRows?: number;
}

// =============================================================================
// Repository Interface
// =============================================================================

/**
 * Interface that import repositories should implement
 */
export interface IImportRepository<TRow, TResult = ImportResult> {
  /** Execute the batch import */
  importBatch(
    items: TRow[],
    tenantId: string,
    userId: string
  ): Promise<TResult>;
}

// =============================================================================
// Lookup Resolution Types
// =============================================================================

/**
 * A lookup value for resolving codes to IDs
 */
export interface LookupValue {
  code: string;
  id: string;
  label?: string;
}

/**
 * Map of lookup type to values
 */
export type LookupMap = Map<string, LookupValue[]>;

/**
 * Context provided during row transformation
 */
export interface TransformContext {
  tenantId: string;
  userId: string;
  lookups: LookupMap;
}
