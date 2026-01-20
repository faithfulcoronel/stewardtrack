/**
 * Reusable Excel Import Framework - Base Service
 *
 * Abstract base class for entity-specific Excel import services.
 * Extend this class to create import services for different entities.
 *
 * @example
 * ```typescript
 * class MemberImportService extends BaseExcelImportService<MemberImportRow, MemberPreview> {
 *   protected getColumns() { ... }
 *   protected async validateRow(row, context) { ... }
 *   protected transformForPreview(row) { ... }
 *   protected async transformForImport(row, context) { ... }
 * }
 * ```
 */

import * as XLSX from "xlsx";
import type {
  ExcelColumnDefinition,
  ExcelImportServiceConfig,
  ImportData,
  ImportError,
  ImportResult,
  IImportRepository,
  LookupMap,
  ParsedRow,
  ParseResult,
  PreviewResult,
  TransformContext,
  ValidationResult,
} from "./types";

// =============================================================================
// Abstract Base Class
// =============================================================================

export abstract class BaseExcelImportService<
  TRow extends Record<string, unknown>,
  TPreview = TRow,
  TImport = TRow
> {
  protected config: ExcelImportServiceConfig<TRow>;

  constructor(config: ExcelImportServiceConfig<TRow>) {
    this.config = config;
  }

  // ===========================================================================
  // Abstract Methods - Must be implemented by subclasses
  // ===========================================================================

  /**
   * Get the column definitions for this import type
   */
  protected abstract getColumns(): ExcelColumnDefinition[];

  /**
   * Validate a single row (beyond basic type validation)
   * @param row The parsed row data
   * @param context Transform context with tenant info and lookups
   * @returns Array of errors (empty if valid)
   */
  protected abstract validateRow(
    row: Partial<TRow>,
    context: TransformContext
  ): Promise<ImportError[]>;

  /**
   * Transform a parsed row for preview display
   * @param row The parsed row data
   * @returns The preview object
   */
  protected abstract transformForPreview(row: Partial<TRow>): TPreview;

  /**
   * Transform a parsed row for import (resolve lookups, add defaults)
   * @param row The parsed row data
   * @param context Transform context with tenant info and lookups
   * @returns The import object
   */
  protected abstract transformForImport(
    row: Partial<TRow>,
    context: TransformContext
  ): Promise<TImport>;

  /**
   * Load lookup values needed for validation and transformation
   * @param tenantId The tenant ID
   * @returns Map of lookup type to values
   */
  protected abstract loadLookups(tenantId: string): Promise<LookupMap>;

  // ===========================================================================
  // Template Generation
  // ===========================================================================

  /**
   * Generate the template Excel workbook
   */
  public generateTemplateWorkbook(): XLSX.WorkBook {
    const workbook = XLSX.utils.book_new();
    const columns = this.getColumns();

    // Create data sheet with headers
    const headers = columns.map((col) => col.header);
    const dataSheet = XLSX.utils.aoa_to_array([headers]);

    // Add example rows if provided
    if (this.config.template.exampleRows) {
      for (const example of this.config.template.exampleRows) {
        const row = columns.map((col) => {
          const value = example[col.field as keyof typeof example];
          return value ?? "";
        });
        dataSheet.push(row);
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(dataSheet);

    // Set column widths
    ws["!cols"] = columns.map((col) => ({ wch: col.width ?? 15 }));

    XLSX.utils.book_append_sheet(
      workbook,
      ws,
      this.config.template.sheetName
    );

    // Add instructions sheet if enabled
    if (this.config.template.includeInstructions !== false) {
      const instructionsSheet = this.generateInstructionsSheet(columns);
      XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");
    }

    return workbook;
  }

  /**
   * Get template as buffer for download
   */
  public getTemplateBuffer(): Buffer {
    const workbook = this.generateTemplateWorkbook();
    return Buffer.from(
      XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })
    );
  }

  /**
   * Generate the instructions sheet
   */
  protected generateInstructionsSheet(
    columns: ExcelColumnDefinition[]
  ): XLSX.WorkSheet {
    const instructions: string[][] = [
      [`${this.config.entityName} Import Instructions`],
      [""],
      ["Column Reference:"],
      ["Column", "Required", "Type", "Description"],
    ];

    for (const col of columns) {
      let typeDesc = col.type;
      if (col.type === "lookup" && col.lookupValues) {
        typeDesc = `One of: ${col.lookupValues.join(", ")}`;
      } else if (col.type === "date") {
        typeDesc = "Date (YYYY-MM-DD)";
      } else if (col.type === "email") {
        typeDesc = "Email address";
      } else if (col.type === "boolean") {
        typeDesc = "Yes/No, True/False, or 1/0";
      }

      instructions.push([
        col.header,
        col.required ? "Yes" : "No",
        typeDesc,
        col.description ?? "",
      ]);
    }

    instructions.push([""]);
    instructions.push(["Notes:"]);
    instructions.push([
      `- Maximum ${this.config.maxRows ?? 1000} ${this.config.entityNamePlural.toLowerCase()} per import`,
    ]);
    instructions.push(["- First row must contain column headers exactly as shown"]);
    instructions.push(["- Do not modify or remove the header row"]);

    if (this.config.template.instructionsText) {
      instructions.push([""]);
      instructions.push([this.config.template.instructionsText]);
    }

    const ws = XLSX.utils.aoa_to_sheet(instructions);
    ws["!cols"] = [{ wch: 25 }, { wch: 12 }, { wch: 30 }, { wch: 50 }];

    return ws;
  }

  // ===========================================================================
  // Parsing
  // ===========================================================================

  /**
   * Parse an Excel file buffer into rows
   */
  public async parseFile(
    buffer: ArrayBuffer,
    tenantId: string,
    userId: string
  ): Promise<ParseResult<TRow>> {
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    const columns = this.getColumns();

    // Find the data sheet
    const sheetName =
      workbook.SheetNames.find(
        (name) =>
          name.toLowerCase() === this.config.template.sheetName.toLowerCase()
      ) || workbook.SheetNames[0];

    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      return {
        rows: [],
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        errors: [
          {
            sheet: sheetName,
            row: 0,
            field: "",
            message: "Sheet not found in workbook",
          },
        ],
      };
    }

    // Convert to JSON with headers
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      raw: false,
      dateNF: "yyyy-mm-dd",
    });

    // Check max rows
    if (this.config.maxRows && jsonData.length > this.config.maxRows) {
      return {
        rows: [],
        totalRows: jsonData.length,
        validRows: 0,
        invalidRows: jsonData.length,
        errors: [
          {
            sheet: sheetName,
            row: 0,
            field: "",
            message: `Too many rows. Maximum allowed is ${this.config.maxRows}`,
          },
        ],
      };
    }

    // Load lookups for validation
    const lookups = await this.loadLookups(tenantId);
    const context: TransformContext = { tenantId, userId, lookups };

    // Parse and validate each row
    const rows: ParsedRow<TRow>[] = [];
    const allErrors: ImportError[] = [];

    for (let i = 0; i < jsonData.length; i++) {
      const rowNumber = i + 2; // 1-indexed, +1 for header
      const rawRow = jsonData[i];

      // Map Excel headers to field names
      const mappedRow = this.mapRowToFields(rawRow, columns);

      // Basic type validation
      const typeErrors = this.validateTypes(
        mappedRow,
        columns,
        sheetName,
        rowNumber
      );

      // Custom validation
      const customErrors = await this.validateRow(mappedRow, context);
      const rowErrors = [...typeErrors, ...customErrors];

      rows.push({
        rowNumber,
        data: mappedRow,
        isValid: rowErrors.length === 0,
        errors: rowErrors,
      });

      allErrors.push(...rowErrors);
    }

    const validRows = rows.filter((r) => r.isValid).length;

    return {
      rows,
      totalRows: rows.length,
      validRows,
      invalidRows: rows.length - validRows,
      errors: allErrors,
    };
  }

  /**
   * Map Excel row (with header keys) to field names
   */
  protected mapRowToFields(
    rawRow: Record<string, unknown>,
    columns: ExcelColumnDefinition[]
  ): Partial<TRow> {
    const result: Record<string, unknown> = {};

    for (const col of columns) {
      // Try exact header match first
      let value = rawRow[col.header];

      // Try case-insensitive match
      if (value === undefined) {
        const headerLower = col.header.toLowerCase();
        const key = Object.keys(rawRow).find(
          (k) => k.toLowerCase() === headerLower
        );
        if (key) {
          value = rawRow[key];
        }
      }

      // Normalize the value
      result[col.field] = this.normalizeValue(value, col.type);
    }

    return result as Partial<TRow>;
  }

  /**
   * Normalize a cell value based on expected type
   */
  protected normalizeValue(
    value: unknown,
    type: ExcelColumnDefinition["type"]
  ): unknown {
    if (value === undefined || value === null || value === "") {
      return null;
    }

    const strValue = String(value).trim();
    if (strValue === "") {
      return null;
    }

    switch (type) {
      case "number":
        const num = Number(strValue);
        return isNaN(num) ? strValue : num;

      case "boolean":
        const lower = strValue.toLowerCase();
        if (["yes", "true", "1", "y"].includes(lower)) return true;
        if (["no", "false", "0", "n"].includes(lower)) return false;
        return strValue;

      case "date":
        // If already a Date object, format it
        if (value instanceof Date) {
          return value.toISOString().split("T")[0];
        }
        return strValue;

      default:
        return strValue;
    }
  }

  /**
   * Validate types for all fields in a row
   */
  protected validateTypes(
    row: Partial<TRow>,
    columns: ExcelColumnDefinition[],
    sheet: string,
    rowNumber: number
  ): ImportError[] {
    const errors: ImportError[] = [];

    for (const col of columns) {
      const value = row[col.field as keyof TRow];

      // Check required
      if (col.required && (value === null || value === undefined)) {
        errors.push({
          sheet,
          row: rowNumber,
          field: col.field,
          message: `${col.header} is required`,
        });
        continue;
      }

      // Skip further validation if empty and not required
      if (value === null || value === undefined) {
        continue;
      }

      // Type-specific validation
      const typeError = this.validateType(value, col);
      if (typeError) {
        errors.push({
          sheet,
          row: rowNumber,
          field: col.field,
          message: typeError,
        });
      }

      // Custom validation
      if (col.validate) {
        const result = col.validate(value);
        if (!result.isValid && result.message) {
          errors.push({
            sheet,
            row: rowNumber,
            field: col.field,
            message: result.message,
          });
        }
      }
    }

    return errors;
  }

  /**
   * Validate a single value against its expected type
   */
  protected validateType(
    value: unknown,
    col: ExcelColumnDefinition
  ): string | null {
    switch (col.type) {
      case "email":
        if (typeof value === "string") {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            return `Invalid email format`;
          }
        }
        break;

      case "number":
        if (typeof value !== "number" && isNaN(Number(value))) {
          return `Must be a number`;
        }
        break;

      case "date":
        if (typeof value === "string") {
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(value)) {
            const parsed = Date.parse(value);
            if (isNaN(parsed)) {
              return `Invalid date format (use YYYY-MM-DD)`;
            }
          }
        }
        break;

      case "boolean":
        if (typeof value !== "boolean") {
          return `Must be Yes/No, True/False, or 1/0`;
        }
        break;

      case "lookup":
        if (col.lookupValues && typeof value === "string") {
          const valid = col.lookupValues.some(
            (v) => v.toLowerCase() === value.toLowerCase()
          );
          if (!valid) {
            return `Must be one of: ${col.lookupValues.join(", ")}`;
          }
        }
        break;
    }

    return null;
  }

  // ===========================================================================
  // Preview
  // ===========================================================================

  /**
   * Get preview result for display to user
   */
  public async getPreviewResult(
    buffer: ArrayBuffer,
    tenantId: string,
    userId: string
  ): Promise<PreviewResult<TPreview>> {
    const parseResult = await this.parseFile(buffer, tenantId, userId);

    // Transform valid rows for preview
    const validItems = parseResult.rows
      .filter((r) => r.isValid)
      .map((r) => this.transformForPreview(r.data));

    return {
      success: parseResult.errors.length === 0,
      preview: true,
      data: {
        totalRows: parseResult.totalRows,
        validRows: parseResult.validRows,
        invalidRows: parseResult.invalidRows,
      },
      errors: parseResult.errors,
      validItems,
    };
  }

  // ===========================================================================
  // Import Execution
  // ===========================================================================

  /**
   * Execute the import using the provided repository
   */
  public async executeImport(
    buffer: ArrayBuffer,
    tenantId: string,
    userId: string,
    repository: IImportRepository<TImport>
  ): Promise<ImportResult> {
    // Parse and validate
    const parseResult = await this.parseFile(buffer, tenantId, userId);

    if (parseResult.validRows === 0) {
      return {
        success: false,
        error: "No valid rows to import",
        data: {
          imported_count: 0,
          error_count: parseResult.invalidRows,
          errors: parseResult.errors.map((e) => ({
            row: e.row,
            field: e.field,
            message: e.message,
          })),
        },
      };
    }

    // Load lookups for transformation
    const lookups = await this.loadLookups(tenantId);
    const context: TransformContext = { tenantId, userId, lookups };

    // Transform valid rows for import
    const itemsToImport: TImport[] = [];
    for (const row of parseResult.rows) {
      if (row.isValid) {
        const transformed = await this.transformForImport(row.data, context);
        itemsToImport.push(transformed);
      }
    }

    // Execute batch import
    try {
      const result = await repository.importBatch(
        itemsToImport,
        tenantId,
        userId
      );
      return result;
    } catch (error) {
      console.error("Import execution error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Import failed",
      };
    }
  }
}
