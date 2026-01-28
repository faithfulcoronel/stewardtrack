/**
 * Models for Product Offering Import/Export functionality
 */

import { LicenseTier, ProductOfferingType } from '@/enums/licensing.enums';

/**
 * Represents a row from the Excel import file
 */
export interface ProductOfferingImportRow {
  /** Unique identifier - used as match key for updates */
  code: string;
  /** Display name */
  name: string;
  /** Full description */
  description?: string | null;
  /** Type: subscription, one_time, trial */
  offering_type: ProductOfferingType | string;
  /** Tier: essential, professional, enterprise, premium */
  tier: LicenseTier | string;
  /** Billing cycle: monthly, annual, lifetime */
  billing_cycle?: 'monthly' | 'annual' | 'lifetime' | null;
  /** Member limit (empty = unlimited) */
  max_members?: number | null;
  /** Admin user limit */
  max_admin_users?: number | null;
  /** SMS quota */
  max_sms_per_month?: number | null;
  /** Email quota */
  max_emails_per_month?: number | null;
  /** Storage limit in MB */
  max_storage_mb?: number | null;
  /** Transaction limit */
  max_transactions_per_month?: number | null;
  /** AI credits limit */
  max_ai_credits_per_month?: number | null;
  /** Trial period days */
  trial_days?: number | null;
  /** Active status */
  is_active: boolean;
  /** Featured flag */
  is_featured: boolean;
  /** Display order */
  sort_order?: number | null;
  /** Comma-separated feature codes */
  feature_codes?: string | null;
  /** Comma-separated bundle codes */
  bundle_codes?: string | null;
  /** PHP price */
  price_php?: number | null;
  /** USD price */
  price_usd?: number | null;
  /** Original row number in Excel for error reporting */
  _rowNumber?: number;
}

/**
 * Validation error for a specific row/field
 */
export interface ProductOfferingValidationError {
  /** Row number in Excel (1-based) */
  rowNumber: number;
  /** Code of the offering (for identification) */
  code: string;
  /** Field that has the error */
  field: string;
  /** Error message */
  message: string;
  /** Severity: error prevents import, warning is informational */
  severity: 'error' | 'warning';
}

/**
 * Result of validating import rows
 */
export interface ProductOfferingValidationResult {
  /** Whether validation passed (no errors) */
  isValid: boolean;
  /** Total rows in the import file */
  totalRows: number;
  /** Number of rows with errors */
  errorCount: number;
  /** Number of rows with warnings */
  warningCount: number;
  /** All validation errors and warnings */
  errors: ProductOfferingValidationError[];
  /** Validated rows (only rows without errors) */
  validRows: ProductOfferingImportRow[];
}

/**
 * Preview result showing what will happen for each row
 */
export interface ProductOfferingPreviewRow {
  /** Row number in Excel (1-based) */
  rowNumber: number;
  /** Code of the offering */
  code: string;
  /** Name of the offering */
  name: string;
  /** What will happen: create, update, skip, error */
  status: 'create' | 'update' | 'skip' | 'error';
  /** Error message if status is error */
  error?: string;
  /** Changes that will be made (for updates) */
  changes?: ProductOfferingChange[];
  /** The parsed row data */
  data: ProductOfferingImportRow;
}

/**
 * Represents a single field change in an update
 */
export interface ProductOfferingChange {
  /** Field name */
  field: string;
  /** Current value */
  oldValue: string | number | boolean | null | undefined;
  /** New value from import */
  newValue: string | number | boolean | null | undefined;
}

/**
 * Result of preview operation
 */
export interface ProductOfferingPreviewResult {
  /** Total rows processed */
  totalRows: number;
  /** Rows that will be created */
  createCount: number;
  /** Rows that will be updated */
  updateCount: number;
  /** Rows that will be skipped (no changes) */
  skipCount: number;
  /** Rows with errors */
  errorCount: number;
  /** Detailed preview for each row */
  rows: ProductOfferingPreviewRow[];
}

/**
 * Result of executing the import
 */
export interface ProductOfferingExecuteResult {
  /** Whether the import succeeded */
  success: boolean;
  /** Total rows processed */
  processed: number;
  /** Rows created */
  created: number;
  /** Rows updated */
  updated: number;
  /** Rows with errors */
  errors: Array<{
    code: string;
    error: string;
  }>;
  /** Individual results per row */
  results: Array<{
    code: string;
    status: 'created' | 'updated' | 'error';
    id?: string;
    error?: string;
  }>;
}

/**
 * Options for export
 */
export interface ProductOfferingExportOptions {
  /** Include inactive offerings */
  includeInactive?: boolean;
  /** Filter by tier */
  tier?: LicenseTier | string;
  /** Filter by offering type */
  offeringType?: ProductOfferingType | string;
}

/**
 * Excel column definition for template
 */
export interface ExcelColumnDefinition {
  /** Column header name */
  header: string;
  /** Field key in data */
  key: string;
  /** Column width */
  width: number;
  /** Whether the field is required */
  required: boolean;
  /** Description for template instructions */
  description: string;
  /** Allowed values (for dropdowns) */
  allowedValues?: string[];
  /** Data type hint */
  type: 'string' | 'number' | 'boolean';
}

/**
 * Column definitions for the Excel template
 */
export const PRODUCT_OFFERING_COLUMNS: ExcelColumnDefinition[] = [
  {
    header: 'Code',
    key: 'code',
    width: 30,
    required: true,
    description: 'Unique identifier (used to match for updates)',
    type: 'string',
  },
  {
    header: 'Name',
    key: 'name',
    width: 25,
    required: true,
    description: 'Display name of the offering',
    type: 'string',
  },
  {
    header: 'Description',
    key: 'description',
    width: 50,
    required: false,
    description: 'Full description',
    type: 'string',
  },
  {
    header: 'Offering Type',
    key: 'offering_type',
    width: 15,
    required: true,
    description: 'Type of offering',
    allowedValues: ['subscription', 'one-time', 'trial', 'enterprise'],
    type: 'string',
  },
  {
    header: 'Tier',
    key: 'tier',
    width: 15,
    required: true,
    description: 'License tier',
    allowedValues: ['essential', 'premium', 'professional', 'enterprise'],
    type: 'string',
  },
  {
    header: 'Billing Cycle',
    key: 'billing_cycle',
    width: 15,
    required: false,
    description: 'Billing frequency',
    allowedValues: ['monthly', 'annual', 'lifetime'],
    type: 'string',
  },
  {
    header: 'Max Members',
    key: 'max_members',
    width: 12,
    required: false,
    description: 'Member limit (empty = unlimited)',
    type: 'number',
  },
  {
    header: 'Max Admin Users',
    key: 'max_admin_users',
    width: 15,
    required: false,
    description: 'Admin user limit (empty = unlimited)',
    type: 'number',
  },
  {
    header: 'Max SMS/Month',
    key: 'max_sms_per_month',
    width: 15,
    required: false,
    description: 'Monthly SMS quota (empty = unlimited)',
    type: 'number',
  },
  {
    header: 'Max Emails/Month',
    key: 'max_emails_per_month',
    width: 18,
    required: false,
    description: 'Monthly email quota (empty = unlimited)',
    type: 'number',
  },
  {
    header: 'Max Storage (MB)',
    key: 'max_storage_mb',
    width: 18,
    required: false,
    description: 'Storage limit in MB (empty = unlimited)',
    type: 'number',
  },
  {
    header: 'Max Transactions/Month',
    key: 'max_transactions_per_month',
    width: 22,
    required: false,
    description: 'Transaction limit (empty = unlimited)',
    type: 'number',
  },
  {
    header: 'Max AI Credits/Month',
    key: 'max_ai_credits_per_month',
    width: 20,
    required: false,
    description: 'AI credits limit (empty = unlimited)',
    type: 'number',
  },
  {
    header: 'Trial Days',
    key: 'trial_days',
    width: 12,
    required: false,
    description: 'Trial period in days (only for trial type)',
    type: 'number',
  },
  {
    header: 'Is Active',
    key: 'is_active',
    width: 10,
    required: true,
    description: 'Active status (TRUE/FALSE)',
    allowedValues: ['TRUE', 'FALSE'],
    type: 'boolean',
  },
  {
    header: 'Is Featured',
    key: 'is_featured',
    width: 12,
    required: true,
    description: 'Featured flag (TRUE/FALSE)',
    allowedValues: ['TRUE', 'FALSE'],
    type: 'boolean',
  },
  {
    header: 'Sort Order',
    key: 'sort_order',
    width: 12,
    required: false,
    description: 'Display order (lower = first)',
    type: 'number',
  },
  {
    header: 'Feature Codes',
    key: 'feature_codes',
    width: 40,
    required: false,
    description: 'Comma-separated feature codes',
    type: 'string',
  },
  {
    header: 'Bundle Codes',
    key: 'bundle_codes',
    width: 40,
    required: false,
    description: 'Comma-separated bundle codes',
    type: 'string',
  },
  {
    header: 'Price (PHP)',
    key: 'price_php',
    width: 12,
    required: false,
    description: 'Price in Philippine Peso',
    type: 'number',
  },
  {
    header: 'Price (USD)',
    key: 'price_usd',
    width: 12,
    required: false,
    description: 'Price in US Dollar',
    type: 'number',
  },
];
