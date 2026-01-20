import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import * as XLSX from 'xlsx';
import { TYPES } from '@/lib/types';
import type { IMemberImportRepository } from '@/repositories/memberImport.repository';
import type {
  MemberImportRow,
  MemberImportData,
  MemberImportResult,
} from '@/adapters/memberImport.adapter';
import {
  BaseExcelImportService,
  type ExcelColumnDefinition,
  type ImportError,
  type LookupMap,
  type TransformContext,
  validateEmail,
  validateLookup,
  getString,
  parseDate,
  parseTags,
  getLookups,
} from '@/lib/excel-import';

// =============================================================================
// Types (kept for backward compatibility)
// =============================================================================

export interface ValidationError {
  sheet: string;
  row: number;
  field: string;
  message: string;
}

export interface ParsedImportData {
  data: MemberImportData;
  errors: ValidationError[];
}

export interface ImportPreviewResult {
  success: boolean;
  preview: true;
  data: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
  };
  errors: ValidationError[];
  validMembers: MemberImportRow[];
}

export interface TemplateData {
  membershipTypes: Array<{ id: string; name: string; code: string }>;
  membershipStages: Array<{ id: string; name: string; code: string }>;
  membershipCenters: Array<{ id: string; name: string; code: string }>;
}

// =============================================================================
// Service Interface (kept for backward compatibility)
// =============================================================================

export interface IMemberImportService {
  getTemplateData(tenantId: string): Promise<TemplateData>;
  generateTemplateWorkbook(data: TemplateData): XLSX.WorkBook;
  parseExcelFile(file: File, tenantId: string): Promise<ParsedImportData>;
  getPreviewResult(parsedData: ParsedImportData): ImportPreviewResult;
  executeImport(data: MemberImportData, tenantId: string, userId: string): Promise<MemberImportResult>;
}

// =============================================================================
// Preview Type for display
// =============================================================================

interface MemberPreview {
  first_name: string;
  last_name: string;
  email?: string | null;
}

// =============================================================================
// Column Field Type
// =============================================================================

type MemberField =
  | 'first_name'
  | 'last_name'
  | 'middle_name'
  | 'preferred_name'
  | 'email'
  | 'contact_number'
  | 'gender'
  | 'marital_status'
  | 'birthday'
  | 'anniversary'
  | 'address_street'
  | 'address_city'
  | 'address_state'
  | 'address_postal_code'
  | 'address_country'
  | 'occupation'
  | 'membership_type_code'
  | 'membership_stage_code'
  | 'membership_center_code'
  | 'membership_date'
  | 'tags';

// =============================================================================
// Constants
// =============================================================================

/**
 * Batch size for importing members.
 * Smaller batches prevent transaction timeouts and memory issues.
 */
const IMPORT_BATCH_SIZE = 50;

// =============================================================================
// Implementation
// =============================================================================

@injectable()
export class MemberImportService
  extends BaseExcelImportService<Record<string, unknown>, MemberPreview, MemberImportRow>
  implements IMemberImportService
{
  private templateData: TemplateData | null = null;

  constructor(
    @inject(TYPES.IMemberImportRepository)
    private readonly repository: IMemberImportRepository
  ) {
    super({
      entityName: 'Member',
      entityNamePlural: 'Members',
      maxRows: 5000, // Increased limit since we now batch
      template: {
        sheetName: 'Members',
        columns: [], // Will be populated by getColumns()
        includeInstructions: true,
        instructionsText: 'Ensure all codes match your configured membership types, stages, and centers.',
      },
    });
  }

  // ===========================================================================
  // Abstract Method Implementations
  // ===========================================================================

  protected getColumns(): ExcelColumnDefinition<MemberField>[] {
    return [
      { field: 'first_name', header: 'First Name*', required: true, type: 'string', width: 15, description: 'Member first name (required)' },
      { field: 'last_name', header: 'Last Name*', required: true, type: 'string', width: 15, description: 'Member last name (required)' },
      { field: 'middle_name', header: 'Middle Name', required: false, type: 'string', width: 15 },
      { field: 'preferred_name', header: 'Preferred Name', required: false, type: 'string', width: 15 },
      { field: 'email', header: 'Email', required: false, type: 'email', width: 25, description: 'Email address' },
      { field: 'contact_number', header: 'Contact Number', required: false, type: 'string', width: 15 },
      { field: 'gender', header: 'Gender', required: false, type: 'lookup', width: 10, lookupValues: ['male', 'female', 'other'], description: 'male, female, or other' },
      { field: 'marital_status', header: 'Marital Status', required: false, type: 'lookup', width: 12, lookupValues: ['single', 'married', 'widowed', 'divorced', 'engaged'], description: 'single, married, widowed, divorced, or engaged' },
      { field: 'birthday', header: 'Birthday', required: false, type: 'date', width: 12, description: 'Date in YYYY-MM-DD format' },
      { field: 'anniversary', header: 'Anniversary', required: false, type: 'date', width: 12, description: 'Date in YYYY-MM-DD format' },
      { field: 'address_street', header: 'Address Street', required: false, type: 'string', width: 20 },
      { field: 'address_city', header: 'Address City', required: false, type: 'string', width: 15 },
      { field: 'address_state', header: 'Address State', required: false, type: 'string', width: 15 },
      { field: 'address_postal_code', header: 'Address Postal Code', required: false, type: 'string', width: 15 },
      { field: 'address_country', header: 'Address Country', required: false, type: 'string', width: 15 },
      { field: 'occupation', header: 'Occupation', required: false, type: 'string', width: 15 },
      { field: 'membership_type_code', header: 'Membership Type Code', required: false, type: 'lookup', width: 20, description: 'Code from membership types' },
      { field: 'membership_stage_code', header: 'Membership Stage Code', required: false, type: 'lookup', width: 20, description: 'Code from membership stages' },
      { field: 'membership_center_code', header: 'Membership Center Code', required: false, type: 'lookup', width: 20, description: 'Code from membership centers' },
      { field: 'membership_date', header: 'Membership Date', required: false, type: 'date', width: 12, description: 'Date in YYYY-MM-DD format' },
      { field: 'tags', header: 'Tags', required: false, type: 'string', width: 20, description: 'Comma-separated tags' },
    ];
  }

  protected async validateRow(
    row: Partial<Record<string, unknown>>,
    context: TransformContext
  ): Promise<ImportError[]> {
    const errors: ImportError[] = [];
    const sheet = this.config.template.sheetName;

    // Validate email format
    const emailResult = validateEmail(row.email);
    if (!emailResult.isValid && emailResult.message) {
      errors.push({ sheet, row: 0, field: 'email', message: emailResult.message });
    }

    // Validate membership type code against lookups
    const typeLookups = getLookups(context.lookups, 'membership_types');
    if (row.membership_type_code && typeLookups.length > 0) {
      const typeResult = validateLookup(row.membership_type_code, typeLookups, 'membership type code');
      if (!typeResult.isValid && typeResult.message) {
        errors.push({ sheet, row: 0, field: 'membership_type_code', message: typeResult.message });
      }
    }

    // Validate membership stage code against lookups
    const stageLookups = getLookups(context.lookups, 'membership_stages');
    if (row.membership_stage_code && stageLookups.length > 0) {
      const stageResult = validateLookup(row.membership_stage_code, stageLookups, 'membership stage code');
      if (!stageResult.isValid && stageResult.message) {
        errors.push({ sheet, row: 0, field: 'membership_stage_code', message: stageResult.message });
      }
    }

    // Validate membership center code against lookups
    const centerLookups = getLookups(context.lookups, 'membership_centers');
    if (row.membership_center_code && centerLookups.length > 0) {
      const centerResult = validateLookup(row.membership_center_code, centerLookups, 'membership center code');
      if (!centerResult.isValid && centerResult.message) {
        errors.push({ sheet, row: 0, field: 'membership_center_code', message: centerResult.message });
      }
    }

    return errors;
  }

  protected transformForPreview(row: Partial<Record<string, unknown>>): MemberPreview {
    return {
      first_name: getString(row.first_name) || '',
      last_name: getString(row.last_name) || '',
      email: getString(row.email),
    };
  }

  protected async transformForImport(
    row: Partial<Record<string, unknown>>,
    _context: TransformContext
  ): Promise<MemberImportRow> {
    return {
      first_name: getString(row.first_name) || '',
      last_name: getString(row.last_name) || '',
      middle_name: getString(row.middle_name),
      preferred_name: getString(row.preferred_name),
      email: getString(row.email),
      contact_number: getString(row.contact_number),
      gender: (getString(row.gender)?.toLowerCase() as MemberImportRow['gender']) || null,
      marital_status: (getString(row.marital_status)?.toLowerCase() as MemberImportRow['marital_status']) || null,
      birthday: parseDate(row.birthday),
      anniversary: parseDate(row.anniversary),
      address_street: getString(row.address_street),
      address_city: getString(row.address_city),
      address_state: getString(row.address_state),
      address_postal_code: getString(row.address_postal_code),
      address_country: getString(row.address_country),
      occupation: getString(row.occupation),
      membership_type_code: getString(row.membership_type_code),
      membership_stage_code: getString(row.membership_stage_code),
      membership_center_code: getString(row.membership_center_code),
      membership_date: parseDate(row.membership_date),
      tags: parseTags(row.tags),
    };
  }

  protected async loadLookups(tenantId: string): Promise<LookupMap> {
    const map = new Map();

    // Load lookup data
    const [membershipTypes, membershipStages, membershipCenters] = await Promise.all([
      this.repository.getMembershipTypes(tenantId),
      this.repository.getMembershipStages(tenantId),
      this.repository.getMembershipCenters(tenantId),
    ]);

    // Store for template generation
    this.templateData = { membershipTypes, membershipStages, membershipCenters };

    // Convert to lookup format
    map.set(
      'membership_types',
      membershipTypes.map((t) => ({ code: t.code, id: t.id, label: t.name }))
    );
    map.set(
      'membership_stages',
      membershipStages.map((s) => ({ code: s.code, id: s.id, label: s.name }))
    );
    map.set(
      'membership_centers',
      membershipCenters.map((c) => ({ code: c.code, id: c.id, label: c.name }))
    );

    return map;
  }

  // ===========================================================================
  // IMemberImportService Interface Implementation (backward compatibility)
  // ===========================================================================

  /**
   * Gets lookup data for template generation
   */
  public async getTemplateData(tenantId: string): Promise<TemplateData> {
    await this.loadLookups(tenantId);
    return this.templateData!;
  }

  /**
   * Generates an Excel workbook with template and instructions
   * This method provides the legacy interface while using the base class pattern
   */
  public generateTemplateWorkbook(data: TemplateData): XLSX.WorkBook {
    const wb = XLSX.utils.book_new();

    // Instructions sheet (custom for members to include lookup codes)
    const instructionsData = [
      ['MEMBERS IMPORT TEMPLATE'],
      [''],
      ['INSTRUCTIONS:'],
      ['1. Fill in the member data in the "Members" sheet'],
      ['2. Required fields are marked with * in the column headers'],
      ['3. Use the lookup codes from this sheet for type, stage, and center fields'],
      ['4. Date format: YYYY-MM-DD (e.g., 1990-01-15)'],
      ['5. Gender options: male, female, other'],
      ['6. Marital status options: single, married, widowed, divorced, engaged'],
      ['7. Tags can be separated by commas (e.g., "youth, volunteer, leader")'],
      [''],
      ['MEMBERSHIP TYPE OPTIONS:'],
    ];

    if (data.membershipTypes.length > 0) {
      instructionsData.push(['Code', 'Name']);
      data.membershipTypes.forEach((type) => {
        instructionsData.push([type.code, type.name]);
      });
    } else {
      instructionsData.push(['(No membership types configured)']);
    }

    instructionsData.push(['']);
    instructionsData.push(['MEMBERSHIP STAGE OPTIONS:']);

    if (data.membershipStages.length > 0) {
      instructionsData.push(['Code', 'Name']);
      data.membershipStages.forEach((stage) => {
        instructionsData.push([stage.code, stage.name]);
      });
    } else {
      instructionsData.push(['(No membership stages configured)']);
    }

    instructionsData.push(['']);
    instructionsData.push(['MEMBERSHIP CENTER OPTIONS:']);

    if (data.membershipCenters.length > 0) {
      instructionsData.push(['Code', 'Name']);
      data.membershipCenters.forEach((center) => {
        instructionsData.push([center.code, center.name]);
      });
    } else {
      instructionsData.push(['(No membership centers configured)']);
    }

    const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
    wsInstructions['!cols'] = [{ wch: 30 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

    // Members sheet with headers and sample row
    const columns = this.getColumns();
    const membersHeaders = columns.map((c) => c.header);

    const sampleRow = [
      'John',
      'Doe',
      'Michael',
      'Johnny',
      'john.doe@example.com',
      '+1234567890',
      'male',
      'married',
      '1990-01-15',
      '2015-06-20',
      '123 Main St',
      'Springfield',
      'IL',
      '62701',
      'USA',
      'Engineer',
      data.membershipTypes[0]?.code || 'member',
      data.membershipStages[0]?.code || 'active',
      data.membershipCenters[0]?.code || '',
      '2024-01-01',
      'youth, volunteer',
    ];

    const wsMembers = XLSX.utils.aoa_to_sheet([membersHeaders, sampleRow]);
    wsMembers['!cols'] = columns.map((c) => ({ wch: c.width ?? 15 }));
    XLSX.utils.book_append_sheet(wb, wsMembers, 'Members');

    return wb;
  }

  /**
   * Parses an Excel file and validates the data
   * Legacy interface - delegates to base class with adaptation
   */
  public async parseExcelFile(file: File, tenantId: string): Promise<ParsedImportData> {
    const arrayBuffer = await file.arrayBuffer();
    const parseResult = await this.parseFile(arrayBuffer, tenantId, '');

    // Convert to legacy format
    const members: MemberImportRow[] = [];
    for (const row of parseResult.rows) {
      if (row.data.first_name || row.data.last_name) {
        const member = await this.transformForImport(row.data, {
          tenantId,
          userId: '',
          lookups: await this.loadLookups(tenantId),
        });
        members.push(member);
      }
    }

    return {
      data: { members },
      errors: parseResult.errors,
    };
  }

  /**
   * Gets preview result from parsed data
   * Legacy interface for backward compatibility
   */
  public getPreviewResult(parsedData: ParsedImportData): ImportPreviewResult {
    const { data, errors } = parsedData;

    // Get rows with errors (by row number)
    const errorRowNumbers = new Set(errors.map((e) => e.row));

    // Filter out invalid rows for the valid members list
    const validMembers = data.members.filter((_, index) => {
      const rowNum = index + 2; // Account for header row
      return !errorRowNumbers.has(rowNum);
    });

    return {
      success: errors.length === 0,
      preview: true,
      data: {
        totalRows: data.members.length,
        validRows: validMembers.length,
        invalidRows: data.members.length - validMembers.length,
      },
      errors,
      validMembers,
    };
  }

  /**
   * Executes the import via repository with batch processing.
   * Splits large imports into smaller batches to prevent timeouts.
   */
  public async executeImport(
    data: MemberImportData,
    tenantId: string,
    userId: string
  ): Promise<MemberImportResult> {
    const members = data.members;
    const totalMembers = members.length;

    // If small enough, import directly
    if (totalMembers <= IMPORT_BATCH_SIZE) {
      return this.repository.importMembers(data, tenantId, userId);
    }

    // Split into batches and process sequentially
    const aggregatedResult: MemberImportResult = {
      success: true,
      imported_count: 0,
      error_count: 0,
      errors: [],
      imported_ids: [],
    };

    const totalBatches = Math.ceil(totalMembers / IMPORT_BATCH_SIZE);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * IMPORT_BATCH_SIZE;
      const end = Math.min(start + IMPORT_BATCH_SIZE, totalMembers);
      const batchMembers = members.slice(start, end);

      try {
        const batchResult = await this.repository.importMembers(
          { members: batchMembers },
          tenantId,
          userId
        );

        // Aggregate results
        aggregatedResult.imported_count += batchResult.imported_count;
        aggregatedResult.error_count += batchResult.error_count;

        // Adjust row numbers in errors to reflect actual position
        if (batchResult.errors && batchResult.errors.length > 0) {
          const adjustedErrors = batchResult.errors.map((error) => ({
            ...error,
            row: error.row + start, // Adjust to original row number
          }));
          aggregatedResult.errors.push(...adjustedErrors);
        }

        if (batchResult.imported_ids) {
          aggregatedResult.imported_ids.push(...batchResult.imported_ids);
        }

        // If this batch had errors, mark overall as not fully successful
        if (!batchResult.success) {
          aggregatedResult.success = false;
        }
      } catch (error) {
        // If a batch completely fails, record errors for all members in that batch
        aggregatedResult.success = false;
        aggregatedResult.error_count += batchMembers.length;

        for (let i = 0; i < batchMembers.length; i++) {
          aggregatedResult.errors.push({
            row: start + i + 1, // 1-based row number
            field: 'batch',
            message: error instanceof Error ? error.message : 'Batch import failed',
          });
        }
      }
    }

    return aggregatedResult;
  }

  /**
   * Generates an Excel workbook with all members for export.
   * Uses the same format as the import template for compatibility.
   */
  public async generateExportWorkbook(tenantId: string): Promise<XLSX.WorkBook> {
    // Fetch all members
    const members = await this.repository.getAllMembersForExport(tenantId);

    // Get column definitions
    const columns = this.getColumns();

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Create header row (without the * for required fields in export)
    const headers = columns.map((col) => col.header.replace('*', '').trim());

    // Create data rows
    const dataRows = members.map((member) => [
      member.first_name || '',
      member.last_name || '',
      member.middle_name || '',
      member.preferred_name || '',
      member.email || '',
      member.contact_number || '',
      member.gender || '',
      member.marital_status || '',
      member.birthday || '',
      member.anniversary || '',
      member.address_street || '',
      member.address_city || '',
      member.address_state || '',
      member.address_postal_code || '',
      member.address_country || '',
      member.occupation || '',
      member.membership_type_code || '',
      member.membership_stage_code || '',
      member.membership_center_code || '',
      member.membership_date || '',
      member.tags || '',
    ]);

    // Combine headers and data
    const sheetData = [headers, ...dataRows];

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Set column widths
    ws['!cols'] = columns.map((col) => ({ wch: col.width ?? 15 }));

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Members');

    return wb;
  }
}
