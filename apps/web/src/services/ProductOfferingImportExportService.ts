import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import * as XLSX from 'xlsx';
import { TYPES } from '@/lib/types';
import type {
  ProductOfferingImportRow,
  ProductOfferingValidationResult,
  ProductOfferingValidationError,
  ProductOfferingPreviewResult,
  ProductOfferingPreviewRow,
  ProductOfferingChange,
  ProductOfferingExecuteResult,
  ProductOfferingExportOptions,
} from '@/models/productOfferingImport.model';
import { PRODUCT_OFFERING_COLUMNS } from '@/models/productOfferingImport.model';
import type { IProductOfferingImportExportRepository } from '@/repositories/productOfferingImportExport.repository';
import type {
  ProductOfferingUpsertData,
  ExistingOfferingWithPrices,
  ProductOfferingExportRow,
} from '@/adapters/productOfferingImportExport.adapter';

// ============================================================================
// Types
// ============================================================================

export interface ParsedImportData {
  rows: ProductOfferingImportRow[];
  errors: ProductOfferingValidationError[];
}

export interface TemplateData {
  offerings: ProductOfferingExportRow[];
  features: Array<{ code: string; name: string; tier: string }>;
  bundles: Array<{ code: string; name: string; bundle_type: string }>;
}

export interface IProductOfferingImportExportService {
  getTemplateData(): Promise<TemplateData>;
  generateTemplateWorkbook(data: TemplateData): XLSX.WorkBook;
  generateExportWorkbook(options?: ProductOfferingExportOptions): Promise<XLSX.WorkBook>;
  parseExcelFile(file: File): Promise<ParsedImportData>;
  validateRows(rows: ProductOfferingImportRow[]): Promise<ProductOfferingValidationResult>;
  previewChanges(rows: ProductOfferingImportRow[]): Promise<ProductOfferingPreviewResult>;
  executeBulkUpsert(rows: ProductOfferingImportRow[], userId: string): Promise<ProductOfferingExecuteResult>;
}

// ============================================================================
// Constants
// ============================================================================

const VALID_OFFERING_TYPES = ['subscription', 'one-time', 'trial', 'enterprise'];
const VALID_TIERS = ['essential', 'premium', 'professional', 'enterprise', 'starter', 'custom'];
const VALID_BILLING_CYCLES = ['monthly', 'annual', 'lifetime'];

// ============================================================================
// Implementation
// ============================================================================

@injectable()
export class ProductOfferingImportExportService implements IProductOfferingImportExportService {
  constructor(
    @inject(TYPES.IProductOfferingImportExportRepository)
    private readonly repository: IProductOfferingImportExportRepository
  ) {}

  /**
   * Gets all data for template generation (existing offerings + reference data)
   */
  public async getTemplateData(): Promise<TemplateData> {
    const [offerings, features, bundles] = await Promise.all([
      this.repository.getAllOfferingsForExport(),
      this.repository.getAllFeatureCodes(),
      this.repository.getAllBundleCodes(),
    ]);

    return { offerings, features, bundles };
  }

  /**
   * Generates an Excel workbook for download (template or export)
   */
  public generateTemplateWorkbook(data: TemplateData): XLSX.WorkBook {
    const wb = XLSX.utils.book_new();

    // Instructions sheet
    const instructionsData = [
      ['PRODUCT OFFERINGS IMPORT TEMPLATE'],
      [''],
      ['INSTRUCTIONS:'],
      ['1. Fill in the "Product Offerings" sheet with your offerings data'],
      ['2. Code is the unique identifier used to match existing offerings for updates'],
      ['3. Leave numeric fields empty for "unlimited" (NULL)'],
      ['4. Feature codes should be comma-separated (e.g., "feature.members, feature.finance")'],
      ['5. Bundle codes should be comma-separated (e.g., "bundle-core, bundle-premium")'],
      ['6. Use TRUE/FALSE for boolean fields (Is Active, Is Featured)'],
      [''],
      ['COLUMN REFERENCE:'],
    ];

    // Add column descriptions
    for (const col of PRODUCT_OFFERING_COLUMNS) {
      const required = col.required ? 'Required' : 'Optional';
      const allowedVals = col.allowedValues ? `(${col.allowedValues.join(', ')})` : '';
      instructionsData.push([`${col.header}: ${col.description} [${required}] ${allowedVals}`]);
    }

    const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
    wsInstructions['!cols'] = [{ wch: 100 }];
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

    // Product Offerings sheet
    const offeringsRows = (data.offerings || []).map(o => ({
      'Code': o.code,
      'Name': o.name,
      'Description': o.description || '',
      'Offering Type': o.offering_type,
      'Tier': o.tier,
      'Billing Cycle': o.billing_cycle || '',
      'Max Members': o.max_members ?? '',
      'Max Admin Users': o.max_admin_users ?? '',
      'Max SMS/Month': o.max_sms_per_month ?? '',
      'Max Emails/Month': o.max_emails_per_month ?? '',
      'Max Storage (MB)': o.max_storage_mb ?? '',
      'Max Transactions/Month': o.max_transactions_per_month ?? '',
      'Max AI Credits/Month': o.max_ai_credits_per_month ?? '',
      'Trial Days': o.trial_days ?? '',
      'Is Active': o.is_active ? 'TRUE' : 'FALSE',
      'Is Featured': o.is_featured ? 'TRUE' : 'FALSE',
      'Sort Order': o.sort_order ?? '',
      'Feature Codes': o.feature_codes || '',
      'Bundle Codes': o.bundle_codes || '',
      'Price (PHP)': o.price_php ?? '',
      'Price (USD)': o.price_usd ?? '',
    }));

    // Add sample row if no offerings exist
    if (offeringsRows.length === 0) {
      offeringsRows.push({
        'Code': 'example-offering',
        'Name': 'Example Offering',
        'Description': 'This is an example offering',
        'Offering Type': 'subscription',
        'Tier': 'professional',
        'Billing Cycle': 'monthly',
        'Max Members': 500,
        'Max Admin Users': 5,
        'Max SMS/Month': 1000,
        'Max Emails/Month': 5000,
        'Max Storage (MB)': 5000,
        'Max Transactions/Month': '',
        'Max AI Credits/Month': 100,
        'Trial Days': '',
        'Is Active': 'TRUE',
        'Is Featured': 'FALSE',
        'Sort Order': 1,
        'Feature Codes': '',
        'Bundle Codes': '',
        'Price (PHP)': 2500,
        'Price (USD)': 50,
      });
    }

    const wsOfferings = XLSX.utils.json_to_sheet(offeringsRows);
    wsOfferings['!cols'] = PRODUCT_OFFERING_COLUMNS.map(col => ({ wch: col.width }));
    XLSX.utils.book_append_sheet(wb, wsOfferings, 'Product Offerings');

    // Reference Data sheet
    const referenceData: (string | number)[][] = [
      ['AVAILABLE FEATURES'],
      ['Code', 'Name', 'Tier'],
    ];

    for (const f of data.features || []) {
      referenceData.push([f.code, f.name, f.tier]);
    }

    referenceData.push([]);
    referenceData.push(['AVAILABLE BUNDLES']);
    referenceData.push(['Code', 'Name', 'Type']);

    for (const b of data.bundles || []) {
      referenceData.push([b.code, b.name, b.bundle_type]);
    }

    const wsReference = XLSX.utils.aoa_to_sheet(referenceData);
    wsReference['!cols'] = [{ wch: 35 }, { wch: 40 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsReference, 'Reference Data');

    return wb;
  }

  /**
   * Generates an Excel workbook with current offerings for export
   */
  public async generateExportWorkbook(options: ProductOfferingExportOptions = {}): Promise<XLSX.WorkBook> {
    let offerings = await this.repository.getAllOfferingsForExport();

    // Apply filters
    if (!options.includeInactive) {
      offerings = offerings.filter(o => o.is_active);
    }
    if (options.tier) {
      offerings = offerings.filter(o => o.tier === options.tier);
    }
    if (options.offeringType) {
      offerings = offerings.filter(o => o.offering_type === options.offeringType);
    }

    const wb = XLSX.utils.book_new();

    // Product Offerings sheet
    const rows = offerings.map(o => ({
      'Code': o.code,
      'Name': o.name,
      'Description': o.description || '',
      'Offering Type': o.offering_type,
      'Tier': o.tier,
      'Billing Cycle': o.billing_cycle || '',
      'Max Members': o.max_members ?? '',
      'Max Admin Users': o.max_admin_users ?? '',
      'Max SMS/Month': o.max_sms_per_month ?? '',
      'Max Emails/Month': o.max_emails_per_month ?? '',
      'Max Storage (MB)': o.max_storage_mb ?? '',
      'Max Transactions/Month': o.max_transactions_per_month ?? '',
      'Max AI Credits/Month': o.max_ai_credits_per_month ?? '',
      'Trial Days': o.trial_days ?? '',
      'Is Active': o.is_active ? 'TRUE' : 'FALSE',
      'Is Featured': o.is_featured ? 'TRUE' : 'FALSE',
      'Sort Order': o.sort_order ?? '',
      'Feature Codes': o.feature_codes || '',
      'Bundle Codes': o.bundle_codes || '',
      'Price (PHP)': o.price_php ?? '',
      'Price (USD)': o.price_usd ?? '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = PRODUCT_OFFERING_COLUMNS.map(col => ({ wch: col.width }));
    XLSX.utils.book_append_sheet(wb, ws, 'Product Offerings');

    return wb;
  }

  /**
   * Parses an Excel file and validates the data
   */
  public async parseExcelFile(file: File): Promise<ParsedImportData> {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);

    const validationErrors: ProductOfferingValidationError[] = [];
    const rows: ProductOfferingImportRow[] = [];

    // Find the data sheet - look for "Product Offerings" first, then try first non-instructions sheet
    let sheetName = workbook.SheetNames.find(
      name => name.toLowerCase() === 'product offerings'
    );

    // If not found, try to find any sheet that's not Instructions or Reference Data
    if (!sheetName) {
      sheetName = workbook.SheetNames.find(
        name => !['instructions', 'reference data'].includes(name.toLowerCase())
      );
    }

    // Last resort: use first sheet
    if (!sheetName && workbook.SheetNames.length > 0) {
      sheetName = workbook.SheetNames[0];
    }

    if (!sheetName) {
      throw new Error('No valid worksheet found in the uploaded file');
    }

    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      throw new Error(`Worksheet "${sheetName}" not found in the file`);
    }

    const jsonData = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];

    // Log for debugging (can be removed later)
    console.log(`[ProductOfferingImport] Sheet: ${sheetName}, Rows found: ${jsonData.length}`);

    // Log first row keys for debugging
    if (jsonData.length > 0) {
      console.log('[ProductOfferingImport] First row keys:', Object.keys(jsonData[0]));
    }

    jsonData.forEach((row, index) => {
      const rowNum = index + 2; // Account for header row

      const code = this.normalizeString(row['Code']);

      // Skip empty rows (check if row has any meaningful data)
      if (!code) {
        // Log skipped rows for debugging
        if (Object.keys(row).length > 0) {
          console.log(`[ProductOfferingImport] Row ${rowNum} skipped - no code. Keys:`, Object.keys(row));
        }
        return;
      }

      const importRow: ProductOfferingImportRow = {
        code,
        name: this.normalizeString(row['Name']) || code,
        description: this.normalizeString(row['Description']),
        offering_type: this.normalizeString(row['Offering Type']) || 'subscription',
        tier: this.normalizeString(row['Tier']) || 'premium',
        billing_cycle: this.normalizeString(row['Billing Cycle']) as 'monthly' | 'annual' | 'lifetime' | null,
        max_members: this.normalizeNumber(row['Max Members']),
        max_admin_users: this.normalizeNumber(row['Max Admin Users']),
        max_sms_per_month: this.normalizeNumber(row['Max SMS/Month']),
        max_emails_per_month: this.normalizeNumber(row['Max Emails/Month']),
        max_storage_mb: this.normalizeNumber(row['Max Storage (MB)']),
        max_transactions_per_month: this.normalizeNumber(row['Max Transactions/Month']),
        max_ai_credits_per_month: this.normalizeNumber(row['Max AI Credits/Month']),
        trial_days: this.normalizeNumber(row['Trial Days']),
        is_active: this.normalizeBoolean(row['Is Active'], true),
        is_featured: this.normalizeBoolean(row['Is Featured'], false),
        sort_order: this.normalizeNumber(row['Sort Order']),
        feature_codes: this.normalizeString(row['Feature Codes']),
        bundle_codes: this.normalizeString(row['Bundle Codes']),
        price_php: this.normalizeNumber(row['Price (PHP)']),
        price_usd: this.normalizeNumber(row['Price (USD)']),
        _rowNumber: rowNum,
      };

      rows.push(importRow);
    });

    return { rows, errors: validationErrors };
  }

  /**
   * Validates import rows against business rules
   */
  public async validateRows(rows: ProductOfferingImportRow[]): Promise<ProductOfferingValidationResult> {
    const errors: ProductOfferingValidationError[] = [];
    const validRows: ProductOfferingImportRow[] = [];
    const seenCodes = new Set<string>();

    for (const row of rows) {
      const rowErrors: ProductOfferingValidationError[] = [];
      const rowNumber = row._rowNumber || 0;

      // Check required fields
      if (!row.code || row.code.trim() === '') {
        rowErrors.push({
          rowNumber,
          code: row.code || '(empty)',
          field: 'code',
          message: 'Code is required',
          severity: 'error',
        });
      } else {
        // Check for duplicate codes
        if (seenCodes.has(row.code)) {
          rowErrors.push({
            rowNumber,
            code: row.code,
            field: 'code',
            message: 'Duplicate code in import file',
            severity: 'error',
          });
        }
        seenCodes.add(row.code);
      }

      if (!row.name || row.name.trim() === '') {
        rowErrors.push({
          rowNumber,
          code: row.code,
          field: 'name',
          message: 'Name is required',
          severity: 'error',
        });
      }

      // Validate enum values
      if (row.offering_type && !VALID_OFFERING_TYPES.includes(row.offering_type)) {
        rowErrors.push({
          rowNumber,
          code: row.code,
          field: 'offering_type',
          message: `Invalid offering type: ${row.offering_type}. Valid values: ${VALID_OFFERING_TYPES.join(', ')}`,
          severity: 'error',
        });
      }

      if (row.tier && !VALID_TIERS.includes(row.tier)) {
        rowErrors.push({
          rowNumber,
          code: row.code,
          field: 'tier',
          message: `Invalid tier: ${row.tier}. Valid values: ${VALID_TIERS.join(', ')}`,
          severity: 'error',
        });
      }

      if (row.billing_cycle && !VALID_BILLING_CYCLES.includes(row.billing_cycle)) {
        rowErrors.push({
          rowNumber,
          code: row.code,
          field: 'billing_cycle',
          message: `Invalid billing cycle: ${row.billing_cycle}. Valid values: ${VALID_BILLING_CYCLES.join(', ')}`,
          severity: 'error',
        });
      }

      // Validate numeric fields are non-negative
      const numericFields = [
        'max_members', 'max_admin_users', 'max_sms_per_month',
        'max_emails_per_month', 'max_storage_mb', 'max_transactions_per_month',
        'max_ai_credits_per_month', 'trial_days', 'sort_order', 'price_php', 'price_usd',
      ];

      for (const field of numericFields) {
        const value = (row as unknown as Record<string, number | null | undefined>)[field];
        if (value !== null && value !== undefined && value < 0) {
          rowErrors.push({
            rowNumber,
            code: row.code,
            field,
            message: `${field} cannot be negative`,
            severity: 'error',
          });
        }
      }

      // Add warnings
      if (row.offering_type === 'trial' && !row.trial_days) {
        rowErrors.push({
          rowNumber,
          code: row.code,
          field: 'trial_days',
          message: 'Trial offerings should have trial_days specified',
          severity: 'warning',
        });
      }

      errors.push(...rowErrors);

      // Only add to valid rows if no errors (warnings are OK)
      if (!rowErrors.some(e => e.severity === 'error')) {
        validRows.push(row);
      }
    }

    return {
      isValid: !errors.some(e => e.severity === 'error'),
      totalRows: rows.length,
      errorCount: errors.filter(e => e.severity === 'error').length,
      warningCount: errors.filter(e => e.severity === 'warning').length,
      errors,
      validRows,
    };
  }

  /**
   * Preview changes without executing
   */
  public async previewChanges(rows: ProductOfferingImportRow[]): Promise<ProductOfferingPreviewResult> {
    const previewRows: ProductOfferingPreviewRow[] = [];

    // Fetch existing offerings
    const codes = rows.map(r => r.code);
    const existingOfferings = await this.repository.getExistingOfferingsByCodes(codes);

    const existingMap = new Map<string, ExistingOfferingWithPrices>();
    existingOfferings.forEach(o => {
      existingMap.set(o.code, o);
    });

    let createCount = 0;
    let updateCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const row of rows) {
      const existing = existingMap.get(row.code);
      const rowNumber = row._rowNumber || 0;

      if (!existing) {
        // New offering
        previewRows.push({
          rowNumber,
          code: row.code,
          name: row.name,
          status: 'create',
          data: row,
        });
        createCount++;
      } else {
        // Check for changes
        const changes = this.detectChanges(existing, row);

        if (changes.length > 0) {
          previewRows.push({
            rowNumber,
            code: row.code,
            name: row.name,
            status: 'update',
            changes,
            data: row,
          });
          updateCount++;
        } else {
          previewRows.push({
            rowNumber,
            code: row.code,
            name: row.name,
            status: 'skip',
            data: row,
          });
          skipCount++;
        }
      }
    }

    return {
      totalRows: rows.length,
      createCount,
      updateCount,
      skipCount,
      errorCount,
      rows: previewRows,
    };
  }

  /**
   * Executes the bulk import via RPC
   */
  public async executeBulkUpsert(rows: ProductOfferingImportRow[], userId: string): Promise<ProductOfferingExecuteResult> {
    // Transform rows to the format expected by the RPC
    const offerings: ProductOfferingUpsertData[] = rows.map(row => {
      const featureCodes = row.feature_codes
        ? row.feature_codes.split(',').map(c => c.trim()).filter(Boolean)
        : undefined;

      const bundleCodes = row.bundle_codes
        ? row.bundle_codes.split(',').map(c => c.trim()).filter(Boolean)
        : undefined;

      const prices: Record<string, number> = {};
      if (row.price_php !== null && row.price_php !== undefined) {
        prices['PHP'] = row.price_php;
      }
      if (row.price_usd !== null && row.price_usd !== undefined) {
        prices['USD'] = row.price_usd;
      }

      return {
        code: row.code,
        name: row.name,
        description: row.description,
        offering_type: row.offering_type,
        tier: row.tier,
        billing_cycle: row.billing_cycle,
        max_members: row.max_members,
        max_admin_users: row.max_admin_users,
        max_sms_per_month: row.max_sms_per_month,
        max_emails_per_month: row.max_emails_per_month,
        max_storage_mb: row.max_storage_mb,
        max_transactions_per_month: row.max_transactions_per_month,
        max_ai_credits_per_month: row.max_ai_credits_per_month,
        trial_days: row.trial_days,
        is_active: row.is_active,
        is_featured: row.is_featured,
        sort_order: row.sort_order,
        feature_codes: featureCodes,
        bundle_codes: bundleCodes,
        prices: Object.keys(prices).length > 0 ? prices : undefined,
      };
    });

    // Call the repository
    return this.repository.executeBulkUpsert(offerings, userId);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private normalizeString(value: unknown): string | null {
    if (value === undefined || value === null || value === '') return null;
    return String(value).trim();
  }

  private normalizeNumber(value: unknown): number | null {
    if (value === undefined || value === null || value === '') return null;
    const num = Number(value);
    return isNaN(num) ? null : num;
  }

  private normalizeBoolean(value: unknown, defaultValue: boolean): boolean {
    if (value === undefined || value === null || value === '') return defaultValue;
    const str = String(value).toLowerCase().trim();
    return str === 'true' || str === 'yes' || str === '1';
  }

  private detectChanges(existing: ExistingOfferingWithPrices, row: ProductOfferingImportRow): ProductOfferingChange[] {
    const changes: ProductOfferingChange[] = [];

    const fieldsToCompare = [
      'name', 'description', 'offering_type', 'tier', 'billing_cycle',
      'max_members', 'max_admin_users', 'max_sms_per_month',
      'max_emails_per_month', 'max_storage_mb', 'max_transactions_per_month',
      'max_ai_credits_per_month', 'trial_days', 'is_active', 'is_featured', 'sort_order',
    ];

    for (const field of fieldsToCompare) {
      const oldValue = (existing as unknown as Record<string, unknown>)[field];
      const newValue = (row as unknown as Record<string, unknown>)[field];

      // Normalize null/undefined comparison
      const normalizedOld = oldValue ?? null;
      const normalizedNew = newValue ?? null;

      if (normalizedOld !== normalizedNew) {
        changes.push({
          field,
          oldValue: normalizedOld as string | number | boolean | null,
          newValue: normalizedNew as string | number | boolean | null,
        });
      }
    }

    // Check price changes
    const existingPrices = existing.prices || [];
    const phpPrice = existingPrices.find(p => p.currency === 'PHP')?.price;
    const usdPrice = existingPrices.find(p => p.currency === 'USD')?.price;

    if ((phpPrice ?? null) !== (row.price_php ?? null)) {
      changes.push({
        field: 'price_php',
        oldValue: phpPrice ?? null,
        newValue: row.price_php ?? null,
      });
    }

    if ((usdPrice ?? null) !== (row.price_usd ?? null)) {
      changes.push({
        field: 'price_usd',
        oldValue: usdPrice ?? null,
        newValue: row.price_usd ?? null,
      });
    }

    return changes;
  }
}
