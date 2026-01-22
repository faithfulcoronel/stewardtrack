/**
 * Reusable Excel Import Framework
 *
 * A framework for building server-side Excel import services.
 *
 * @example
 * ```typescript
 * import {
 *   BaseExcelImportService,
 *   ExcelColumnDefinition,
 *   PreviewResult,
 *   ImportResult,
 * } from '@/lib/excel-import';
 *
 * // Define your row type
 * interface MyEntityRow {
 *   name: string;
 *   email: string | null;
 *   status: string | null;
 * }
 *
 * // Create your import service
 * class MyEntityImportService extends BaseExcelImportService<MyEntityRow> {
 *   protected getColumns(): ExcelColumnDefinition[] {
 *     return [
 *       { field: 'name', header: 'Name', required: true, type: 'string' },
 *       { field: 'email', header: 'Email', required: false, type: 'email' },
 *       { field: 'status', header: 'Status', required: false, type: 'lookup', lookupValues: ['active', 'inactive'] },
 *     ];
 *   }
 *
 *   // ... implement other abstract methods
 * }
 * ```
 *
 * @module excel-import
 */

// Types
export type {
  ExcelColumnDefinition,
  ExcelImportServiceConfig,
  IImportRepository,
  ImportData,
  ImportError,
  ImportResult,
  LookupMap,
  LookupValue,
  ParsedRow,
  ParseResult,
  PreviewResult,
  TemplateConfig,
  TransformContext,
  ValidationResult,
} from "./types";

// Base Service
export { BaseExcelImportService } from "./BaseExcelImportService";

// Utilities
export {
  // Validation
  valid,
  invalid,
  validateEmail,
  validatePhone,
  validateDate,
  validateInList,
  validateLookup,
  validateLength,
  // Lookups
  resolveLookup,
  getLookups,
  // Errors
  createError,
  createRowErrors,
  // Data transformation
  getString,
  getStringOrDefault,
  getNumber,
  getBoolean,
  parseDate,
  parseTags,
  // File helpers
  isValidExcelFile,
  getFileExtension,
} from "./utils";
