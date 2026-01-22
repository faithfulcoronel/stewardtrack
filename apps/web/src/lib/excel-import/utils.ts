/**
 * Reusable Excel Import Framework - Utility Functions
 *
 * Common utilities for Excel import operations.
 */

import type { ImportError, LookupMap, LookupValue, ValidationResult } from "./types";

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Create a validation result
 */
export function valid(): ValidationResult {
  return { isValid: true };
}

/**
 * Create an invalid validation result
 */
export function invalid(message: string): ValidationResult {
  return { isValid: false, message };
}

/**
 * Validate email format
 */
export function validateEmail(value: unknown): ValidationResult {
  if (value === null || value === undefined || value === "") {
    return valid(); // Empty is valid (use required for mandatory)
  }

  const email = String(value).trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return invalid("Invalid email format");
  }

  return valid();
}

/**
 * Validate phone number format (flexible)
 */
export function validatePhone(value: unknown): ValidationResult {
  if (value === null || value === undefined || value === "") {
    return valid();
  }

  const phone = String(value).trim();
  // Allow digits, spaces, dashes, parentheses, plus sign
  const phoneRegex = /^[+\d\s\-()]+$/;

  if (!phoneRegex.test(phone) || phone.replace(/\D/g, "").length < 7) {
    return invalid("Invalid phone number format");
  }

  return valid();
}

/**
 * Validate date format (YYYY-MM-DD)
 */
export function validateDate(value: unknown): ValidationResult {
  if (value === null || value === undefined || value === "") {
    return valid();
  }

  const dateStr = String(value).trim();
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (!dateRegex.test(dateStr)) {
    // Try to parse other formats
    const parsed = Date.parse(dateStr);
    if (isNaN(parsed)) {
      return invalid("Invalid date format (use YYYY-MM-DD)");
    }
  }

  return valid();
}

/**
 * Validate value is in a list of allowed values
 */
export function validateInList(
  value: unknown,
  allowedValues: string[],
  label = "value"
): ValidationResult {
  if (value === null || value === undefined || value === "") {
    return valid();
  }

  const strValue = String(value).trim().toLowerCase();
  const isValid = allowedValues.some(
    (v) => v.toLowerCase() === strValue
  );

  if (!isValid) {
    return invalid(`Invalid ${label}. Must be one of: ${allowedValues.join(", ")}`);
  }

  return valid();
}

/**
 * Validate value against lookup codes
 */
export function validateLookup(
  value: unknown,
  lookups: LookupValue[],
  label = "value"
): ValidationResult {
  if (value === null || value === undefined || value === "") {
    return valid();
  }

  const strValue = String(value).trim().toLowerCase();
  const isValid = lookups.some(
    (l) => l.code.toLowerCase() === strValue || l.label?.toLowerCase() === strValue
  );

  if (!isValid) {
    const validCodes = lookups.map((l) => l.code).join(", ");
    return invalid(`Invalid ${label}. Valid codes: ${validCodes}`);
  }

  return valid();
}

/**
 * Validate string length
 */
export function validateLength(
  value: unknown,
  options: { min?: number; max?: number }
): ValidationResult {
  if (value === null || value === undefined || value === "") {
    return valid();
  }

  const strValue = String(value).trim();

  if (options.min !== undefined && strValue.length < options.min) {
    return invalid(`Must be at least ${options.min} characters`);
  }

  if (options.max !== undefined && strValue.length > options.max) {
    return invalid(`Must be at most ${options.max} characters`);
  }

  return valid();
}

// =============================================================================
// Lookup Helpers
// =============================================================================

/**
 * Resolve a code to an ID using lookups
 */
export function resolveLookup(
  value: unknown,
  lookups: LookupValue[]
): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const strValue = String(value).trim().toLowerCase();
  const match = lookups.find(
    (l) => l.code.toLowerCase() === strValue || l.label?.toLowerCase() === strValue
  );

  return match?.id ?? null;
}

/**
 * Get lookups from a LookupMap by type
 */
export function getLookups(map: LookupMap, type: string): LookupValue[] {
  return map.get(type) ?? [];
}

// =============================================================================
// Error Helpers
// =============================================================================

/**
 * Create an import error
 */
export function createError(
  sheet: string,
  row: number,
  field: string,
  message: string
): ImportError {
  return { sheet, row, field, message };
}

/**
 * Create errors for a row
 */
export function createRowErrors(
  sheet: string,
  row: number,
  fieldErrors: Record<string, string>
): ImportError[] {
  return Object.entries(fieldErrors).map(([field, message]) =>
    createError(sheet, row, field, message)
  );
}

// =============================================================================
// Data Transformation Helpers
// =============================================================================

/**
 * Safely get a string value
 */
export function getString(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return String(value).trim();
}

/**
 * Safely get a string value with default
 */
export function getStringOrDefault(value: unknown, defaultValue: string): string {
  const str = getString(value);
  return str ?? defaultValue;
}

/**
 * Safely get a number value
 */
export function getNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const num = Number(value);
  return isNaN(num) ? null : num;
}

/**
 * Safely get a boolean value
 */
export function getBoolean(value: unknown): boolean | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const strValue = String(value).toLowerCase().trim();

  if (["yes", "true", "1", "y"].includes(strValue)) {
    return true;
  }

  if (["no", "false", "0", "n"].includes(strValue)) {
    return false;
  }

  return null;
}

/**
 * Parse a date string to ISO format
 */
export function parseDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }

  const strValue = String(value).trim();

  // Already in ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(strValue)) {
    return strValue;
  }

  // Try to parse
  const parsed = new Date(strValue);
  if (isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().split("T")[0];
}

/**
 * Parse tags from a comma-separated string or array
 */
export function parseTags(value: unknown): string[] | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }

  const strValue = String(value).trim();
  if (!strValue) {
    return null;
  }

  return strValue.split(",").map((t) => t.trim()).filter(Boolean);
}

// =============================================================================
// File Helpers
// =============================================================================

/**
 * Check if a file has a valid Excel extension
 */
export function isValidExcelFile(filename: string): boolean {
  const validExtensions = [".xlsx", ".xls"];
  const lower = filename.toLowerCase();
  return validExtensions.some((ext) => lower.endsWith(ext));
}

/**
 * Get file extension
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot >= 0 ? filename.slice(lastDot).toLowerCase() : "";
}
