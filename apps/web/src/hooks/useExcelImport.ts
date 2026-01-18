"use client";

import * as React from "react";
import * as XLSX from "xlsx";

// =============================================================================
// TYPES
// =============================================================================

export interface ExcelColumnConfig {
  /** Target field name in the output object */
  field: string;
  /** Display header name in template */
  header: string;
  /** Alternative column names to match (case-insensitive) */
  aliases?: string[];
  /** Whether this field is required */
  required?: boolean;
  /** Data type for parsing */
  type?: "string" | "number" | "date";
  /** Column width in template (characters) */
  width?: number;
  /** For reference-only columns in template */
  referenceOnly?: boolean;
  /** Lookup configuration for matching values to options */
  lookup?: {
    options: Array<{ value: string; label: string; code?: string }>;
    /** Which field to use for matching (tries all if not specified) */
    matchBy?: "code" | "value" | "label";
  };
  /** Custom transform function */
  transform?: (value: unknown, row: Record<string, unknown>) => unknown;
  /** Custom validation function (returns error message or null) */
  validate?: (value: unknown, row: Record<string, unknown>) => string | null;
}

export interface ExcelImportConfig<T> {
  /** Column configurations */
  columns: ExcelColumnConfig[];
  /** Sheet name to look for (optional, will try to find best match) */
  sheetName?: string;
  /** Template file name (without extension) */
  templateFileName?: string;
  /** Instructions to include in template */
  instructions?: string[];
  /** Sample data rows for template */
  sampleData?: Record<string, unknown>[];
  /** Additional validation after all rows are parsed */
  validateRow?: (row: T, index: number) => string[];
  /** Transform the final row object */
  transformRow?: (row: Record<string, unknown>) => T;
  /** Generate a unique ID for each row */
  generateId?: () => string;
}

export interface ImportedRow<T> {
  id: string;
  data: T;
  rowNumber: number;
  errors: string[];
  isValid: boolean;
}

export interface UseExcelImportResult<T> {
  // State
  file: File | null;
  isProcessing: boolean;
  preview: ImportedRow<T>[];
  errors: string[];
  validCount: number;
  invalidCount: number;

  // Actions
  processFile: (file: File) => Promise<void>;
  downloadTemplate: () => void;
  reset: () => void;
  getValidRows: () => T[];
}

// =============================================================================
// UTILITIES
// =============================================================================

function generateDefaultId(): string {
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeColumnName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findColumnValue(
  row: Record<string, unknown>,
  config: ExcelColumnConfig
): unknown {
  // Try exact header match first
  if (row[config.header] !== undefined) {
    return row[config.header];
  }

  // Try aliases
  const allNames = [config.header, config.field, ...(config.aliases || [])];
  const normalizedNames = allNames.map(normalizeColumnName);

  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = normalizeColumnName(key);
    if (normalizedNames.includes(normalizedKey)) {
      return value;
    }
  }

  return undefined;
}

function parseValue(
  value: unknown,
  type: ExcelColumnConfig["type"]
): unknown {
  if (value === undefined || value === null || value === "") {
    return type === "number" ? 0 : "";
  }

  switch (type) {
    case "number": {
      const cleaned = String(value).replace(/[^0-9.-]/g, "");
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    case "date": {
      if (value instanceof Date) return value;
      const date = new Date(String(value));
      return isNaN(date.getTime()) ? null : date;
    }
    default:
      return String(value).trim();
  }
}

function lookupValue(
  value: unknown,
  lookup: NonNullable<ExcelColumnConfig["lookup"]>
): string {
  const searchValue = String(value).toLowerCase().trim();
  if (!searchValue) return "";

  const { options, matchBy } = lookup;

  // If matchBy is specified, only try that field
  if (matchBy) {
    const found = options.find((opt) => {
      const fieldValue = matchBy === "code" ? opt.code : opt[matchBy];
      return fieldValue?.toLowerCase() === searchValue;
    });
    return found?.value || "";
  }

  // Try all fields: code, value, label
  const found = options.find(
    (opt) =>
      opt.code?.toLowerCase() === searchValue ||
      opt.value.toLowerCase() === searchValue ||
      opt.label.toLowerCase() === searchValue
  );

  return found?.value || "";
}

// =============================================================================
// HOOK
// =============================================================================

export function useExcelImport<T extends Record<string, unknown>>(
  config: ExcelImportConfig<T>
): UseExcelImportResult<T> {
  const [file, setFile] = React.useState<File | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [preview, setPreview] = React.useState<ImportedRow<T>[]>([]);
  const [errors, setErrors] = React.useState<string[]>([]);

  const validCount = React.useMemo(
    () => preview.filter((row) => row.isValid).length,
    [preview]
  );

  const invalidCount = React.useMemo(
    () => preview.filter((row) => !row.isValid).length,
    [preview]
  );

  const processFile = React.useCallback(
    async (selectedFile: File) => {
      setFile(selectedFile);
      setIsProcessing(true);
      setErrors([]);
      setPreview([]);

      try {
        const data = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(data);

        // Find the right sheet
        let sheetName = config.sheetName
          ? workbook.SheetNames.find(
              (name) => name.toLowerCase() === config.sheetName?.toLowerCase()
            )
          : undefined;

        if (!sheetName) {
          // Try to find a sheet that's not "instructions"
          sheetName = workbook.SheetNames.find(
            (name) =>
              !name.toLowerCase().includes("instruction") &&
              !name.toLowerCase().includes("readme")
          );
        }

        if (!sheetName) {
          sheetName = workbook.SheetNames[0];
        }

        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<
          string,
          unknown
        >[];

        if (jsonData.length === 0) {
          setErrors(["No data found in the Excel file"]);
          setIsProcessing(false);
          return;
        }

        const parsedRows: ImportedRow<T>[] = [];

        jsonData.forEach((row, index) => {
          const rowNumber = index + 2; // Excel row (1-indexed + header)
          const rowErrors: string[] = [];
          const parsedData: Record<string, unknown> = {};

          // Process each column
          for (const colConfig of config.columns) {
            // Skip reference-only columns
            if (colConfig.referenceOnly) continue;

            const rawValue = findColumnValue(row, colConfig);
            let value = parseValue(rawValue, colConfig.type);

            // Apply lookup if configured
            if (colConfig.lookup && value) {
              const lookupResult = lookupValue(value, colConfig.lookup);
              if (!lookupResult && colConfig.required) {
                rowErrors.push(
                  `Row ${rowNumber}: ${colConfig.header} "${value}" not found`
                );
              }
              value = lookupResult;
            }

            // Apply custom transform
            if (colConfig.transform) {
              value = colConfig.transform(value, row);
            }

            // Validate required
            if (colConfig.required) {
              const isEmpty =
                value === undefined ||
                value === null ||
                value === "" ||
                (colConfig.type === "number" && value === 0);

              if (isEmpty && !colConfig.lookup) {
                rowErrors.push(
                  `Row ${rowNumber}: ${colConfig.header} is required`
                );
              }
            }

            // Validate number > 0 if required
            if (
              colConfig.required &&
              colConfig.type === "number" &&
              (value as number) <= 0
            ) {
              rowErrors.push(
                `Row ${rowNumber}: ${colConfig.header} must be greater than 0`
              );
            }

            // Apply custom validation
            if (colConfig.validate) {
              const validationError = colConfig.validate(value, row);
              if (validationError) {
                rowErrors.push(`Row ${rowNumber}: ${validationError}`);
              }
            }

            parsedData[colConfig.field] = value;
          }

          // Apply row transform or use default
          const finalData = config.transformRow
            ? config.transformRow(parsedData)
            : (parsedData as T);

          // Apply row-level validation
          if (config.validateRow) {
            const additionalErrors = config.validateRow(finalData, index);
            rowErrors.push(...additionalErrors.map((e) => `Row ${rowNumber}: ${e}`));
          }

          const id = config.generateId
            ? config.generateId()
            : generateDefaultId();

          parsedRows.push({
            id,
            data: finalData,
            rowNumber,
            errors: rowErrors,
            isValid: rowErrors.length === 0,
          });
        });

        setPreview(parsedRows);

        // Collect all errors for summary
        const allErrors = parsedRows.flatMap((row) => row.errors);
        setErrors(allErrors);
      } catch (error) {
        console.error("Excel parse error:", error);
        setErrors(["Failed to parse Excel file. Please check the file format."]);
      } finally {
        setIsProcessing(false);
      }
    },
    [config]
  );

  const downloadTemplate = React.useCallback(() => {
    const wb = XLSX.utils.book_new();

    // Create instructions sheet if provided
    if (config.instructions && config.instructions.length > 0) {
      // Use array of arrays for multi-column support
      const instructionsRows: (string | number)[][] = [];

      // Add instructions text
      config.instructions.forEach((text) => {
        instructionsRows.push([text, ""]);
      });

      // Add lookup options to instructions with Code and Name in separate columns
      for (const col of config.columns) {
        if (col.lookup && col.lookup.options.length > 0) {
          instructionsRows.push(["", ""]); // Empty row
          instructionsRows.push([`${col.header.toUpperCase()} OPTIONS:`, ""]); // Section header
          instructionsRows.push(["Code", "Name"]); // Column headers for this section
          col.lookup.options.forEach((opt) => {
            instructionsRows.push([opt.code || opt.value, opt.label]);
          });
        }
      }

      const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsRows);
      wsInstructions["!cols"] = [{ wch: 40 }, { wch: 50 }]; // Code column, Name column
      XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");
    }

    // Create data sheet
    const headers = config.columns.map((col) => col.header);
    const sampleData = config.sampleData || [];

    // Create rows with headers
    const dataRows = sampleData.map((sample) => {
      const row: Record<string, unknown> = {};
      config.columns.forEach((col) => {
        row[col.header] = sample[col.field] ?? sample[col.header] ?? "";
      });
      return row;
    });

    // If no sample data, create empty template with just headers
    const wsData =
      dataRows.length > 0
        ? XLSX.utils.json_to_sheet(dataRows)
        : XLSX.utils.aoa_to_sheet([headers]);

    // Set column widths
    wsData["!cols"] = config.columns.map((col) => ({
      wch: col.width || 15,
    }));

    XLSX.utils.book_append_sheet(wb, wsData, "Data");

    // Download
    const fileName = config.templateFileName || "import_template";
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  }, [config]);

  const reset = React.useCallback(() => {
    setFile(null);
    setPreview([]);
    setErrors([]);
    setIsProcessing(false);
  }, []);

  const getValidRows = React.useCallback(() => {
    return preview.filter((row) => row.isValid).map((row) => row.data);
  }, [preview]);

  return {
    file,
    isProcessing,
    preview,
    errors,
    validCount,
    invalidCount,
    processFile,
    downloadTemplate,
    reset,
    getValidRows,
  };
}

export default useExcelImport;
