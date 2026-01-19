import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import * as XLSX from 'xlsx';
import { TYPES } from '@/lib/types';
import type { IFeatureImportRepository } from '@/repositories/featureImport.repository';
import type {
  ImportData,
  ImportResult,
  ExportData,
  FeatureImportRow,
  PermissionImportRow,
  RoleTemplateImportRow,
} from '@/adapters/featureImport.adapter';

// ============================================================================
// Types
// ============================================================================

export interface ValidationError {
  sheet: string;
  row: number;
  field: string;
  message: string;
}

export interface ParsedImportData {
  data: ImportData;
  errors: ValidationError[];
}

export interface ImportPreviewResult {
  success: boolean;
  preview: true;
  data: {
    features: number;
    permissions: number;
    roleTemplates: number;
    breakdown: {
      features: { add: number; update: number; delete: number };
      permissions: { add: number; update: number; delete: number };
      roleTemplates: { add: number; update: number; delete: number };
    };
  };
  errors: ValidationError[];
}

export interface TemplateData extends ExportData {}

// ============================================================================
// Service Interface
// ============================================================================

export interface IFeatureImportService {
  getTemplateData(): Promise<TemplateData>;
  generateTemplateWorkbook(data: TemplateData): XLSX.WorkBook;
  parseExcelFile(file: File): Promise<ParsedImportData>;
  getPreviewResult(parsedData: ParsedImportData): ImportPreviewResult;
  executeImport(data: ImportData, userId: string): Promise<ImportResult>;
}

// ============================================================================
// Implementation
// ============================================================================

@injectable()
export class FeatureImportService implements IFeatureImportService {
  constructor(
    @inject(TYPES.IFeatureImportRepository)
    private readonly repository: IFeatureImportRepository,
  ) {}

  /**
   * Gets all existing data for template generation
   */
  public async getTemplateData(): Promise<TemplateData> {
    return this.repository.getExportData();
  }

  /**
   * Generates an Excel workbook with template and existing data
   */
  public generateTemplateWorkbook(data: TemplateData): XLSX.WorkBook {
    const wb = XLSX.utils.book_new();

    // Instructions sheet
    const instructionsData = [
      ['FEATURES IMPORT TEMPLATE'],
      [''],
      ['INSTRUCTIONS:'],
      ['1. This template contains three sheets: Features, Permissions, and Role Templates'],
      ['2. Each row has an "Action" column that determines what happens on import:'],
      ['   - "add" or empty: Creates a new record (or updates if code already exists)'],
      ['   - "update": Updates an existing record by ID'],
      ['   - "delete": Deletes/deactivates the record by ID'],
      ['3. For new records, leave the ID column empty'],
      ['4. For updates/deletes, the ID column must contain the existing record ID'],
      ['5. Required fields are marked with * in the column headers'],
      [''],
      ['FEATURES SHEET:'],
      ['- code*: Unique feature code (lowercase, underscores, e.g., "member_management")'],
      ['- name*: Display name for the feature'],
      ['- category*: Feature category (core, analytics, reporting, etc.)'],
      ['- tier: License tier (essential, premium, professional, enterprise)'],
      ['- is_active: Whether feature is active (TRUE/FALSE)'],
      ['- is_delegatable: Whether feature can be delegated (TRUE/FALSE)'],
      ['- phase: Feature phase (alpha, beta, ga)'],
      [''],
      ['PERMISSIONS SHEET:'],
      ['- feature_code*: The feature this permission belongs to'],
      ['- permission_code*: Permission code in format category:action (e.g., members:view)'],
      ['- display_name*: Human-readable name'],
      ['- is_required: Whether permission is required for feature (TRUE/FALSE)'],
      ['- display_order: Order in UI (number)'],
      [''],
      ['ROLE TEMPLATES SHEET:'],
      ['- feature_code*: The feature this template belongs to'],
      ['- permission_code*: The permission this template is for'],
      ['- role_key*: Role identifier (see ROLE KEY OPTIONS below)'],
      ['- is_recommended: Whether this role should have this permission (TRUE/FALSE)'],
      ['- reason: Explanation for the recommendation'],
      [''],
      ['CATEGORY OPTIONS:'],
      ['core, analytics, reporting, communication, notification, integration, automation, security, customization, collaboration, management'],
      [''],
      ['TIER OPTIONS:'],
      ['essential, premium, professional, enterprise'],
      [''],
      ['PHASE OPTIONS:'],
      ['alpha, beta, ga'],
      [''],
      ['ROLE KEY OPTIONS:'],
      ['tenant_admin, senior_pastor, associate_pastor, ministry_leader, treasurer, auditor, secretary, deacon_elder, volunteer, member, visitor'],
    ];
    const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
    wsInstructions['!cols'] = [{ wch: 100 }];
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

    // Features sheet
    const featuresRows = (data.features || []).map(f => ({
      'Action': '',
      'ID': f.id,
      'Code*': f.code,
      'Name*': f.name,
      'Description': f.description || '',
      'Category*': f.category || 'core',
      'Tier': f.tier || '',
      'Is Active': f.is_active ? 'TRUE' : 'FALSE',
      'Is Delegatable': f.is_delegatable ? 'TRUE' : 'FALSE',
      'Phase': f.phase || 'ga',
    }));

    // Add sample row if no features exist
    if (featuresRows.length === 0) {
      featuresRows.push({
        'Action': 'add',
        'ID': '',
        'Code*': 'example_feature',
        'Name*': 'Example Feature',
        'Description': 'Description of the feature',
        'Category*': 'core',
        'Tier': 'essential',
        'Is Active': 'TRUE',
        'Is Delegatable': 'FALSE',
        'Phase': 'ga',
      });
    }

    const wsFeatures = XLSX.utils.json_to_sheet(featuresRows);
    wsFeatures['!cols'] = [
      { wch: 10 }, { wch: 40 }, { wch: 30 }, { wch: 40 },
      { wch: 50 }, { wch: 15 }, { wch: 15 }, { wch: 10 },
      { wch: 15 }, { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, wsFeatures, 'Features');

    // Permissions sheet
    const permissionsRows = (data.permissions || []).map(p => ({
      'Action': '',
      'ID': p.id,
      'Feature Code*': (p.feature as { code: string } | null)?.code || '',
      'Permission Code*': p.permission_code,
      'Display Name*': p.display_name,
      'Description': p.description || '',
      'Is Required': p.is_required ? 'TRUE' : 'FALSE',
      'Display Order': p.display_order || 0,
    }));

    // Add sample row if no permissions exist but features do
    if (permissionsRows.length === 0 && data.features.length > 0) {
      permissionsRows.push({
        'Action': 'add',
        'ID': '',
        'Feature Code*': data.features[0].code,
        'Permission Code*': 'category:action',
        'Display Name*': 'View Resource',
        'Description': 'Allows viewing the resource',
        'Is Required': 'TRUE',
        'Display Order': 0,
      });
    }

    const wsPermissions = XLSX.utils.json_to_sheet(permissionsRows);
    wsPermissions['!cols'] = [
      { wch: 10 }, { wch: 40 }, { wch: 30 }, { wch: 30 },
      { wch: 40 }, { wch: 50 }, { wch: 12 }, { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(wb, wsPermissions, 'Permissions');

    // Role Templates sheet
    const roleTemplatesRows = (data.roleTemplates || []).map(rt => ({
      'Action': '',
      'ID': rt.id,
      'Feature Code*': (rt.feature_permission as { feature: { code: string } | null } | null)?.feature?.code || '',
      'Permission Code*': (rt.feature_permission as { permission_code: string } | null)?.permission_code || '',
      'Role Key*': rt.role_key,
      'Is Recommended': rt.is_recommended ? 'TRUE' : 'FALSE',
      'Reason': rt.reason || '',
    }));

    // Add sample row if no role templates exist but permissions do
    if (roleTemplatesRows.length === 0 && data.permissions.length > 0) {
      const firstPerm = data.permissions[0];
      roleTemplatesRows.push({
        'Action': 'add',
        'ID': '',
        'Feature Code*': (firstPerm.feature as { code: string } | null)?.code || '',
        'Permission Code*': firstPerm.permission_code,
        'Role Key*': 'tenant_admin',
        'Is Recommended': 'TRUE',
        'Reason': 'Admin should have full access',
      });
    }

    const wsRoleTemplates = XLSX.utils.json_to_sheet(roleTemplatesRows);
    wsRoleTemplates['!cols'] = [
      { wch: 10 }, { wch: 40 }, { wch: 30 }, { wch: 30 },
      { wch: 15 }, { wch: 15 }, { wch: 50 },
    ];
    XLSX.utils.book_append_sheet(wb, wsRoleTemplates, 'Role Templates');

    return wb;
  }

  /**
   * Parses an Excel file and validates the data
   */
  public async parseExcelFile(file: File): Promise<ParsedImportData> {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);

    const validationErrors: ValidationError[] = [];
    const importData: ImportData = {
      features: [],
      permissions: [],
      roleTemplates: [],
    };

    // Parse Features sheet
    const featuresSheet = workbook.Sheets['Features'];
    if (featuresSheet) {
      const featuresJson = XLSX.utils.sheet_to_json(featuresSheet) as Record<string, unknown>[];

      featuresJson.forEach((row, index) => {
        const rowNum = index + 2; // Account for header row

        const action = this.normalizeAction(row['Action'] as string);
        const code = this.normalizeString(row['Code*'] || row['Code']);
        const name = this.normalizeString(row['Name*'] || row['Name']);
        const category = this.normalizeString(row['Category*'] || row['Category']);

        // Skip empty rows
        if (!code && !name && action !== 'delete') {
          return;
        }

        // Validate required fields for add/update
        if (action !== 'delete') {
          if (!code) {
            validationErrors.push({ sheet: 'Features', row: rowNum, field: 'Code', message: 'Code is required' });
          } else if (!/^[a-z][a-z0-9_]*$/.test(code)) {
            validationErrors.push({ sheet: 'Features', row: rowNum, field: 'Code', message: 'Code must be lowercase with underscores only, starting with a letter' });
          }
          if (!name) {
            validationErrors.push({ sheet: 'Features', row: rowNum, field: 'Name', message: 'Name is required' });
          }
          if (!category) {
            validationErrors.push({ sheet: 'Features', row: rowNum, field: 'Category', message: 'Category is required' });
          }
        }

        // Validate ID for update/delete
        if ((action === 'update' || action === 'delete') && !row['ID']) {
          validationErrors.push({ sheet: 'Features', row: rowNum, field: 'ID', message: 'ID is required for update/delete' });
        }

        importData.features.push({
          action,
          id: this.normalizeString(row['ID']),
          code,
          name,
          description: this.normalizeString(row['Description']),
          category: category || 'core',
          tier: this.normalizeString(row['Tier']),
          is_active: this.normalizeBoolean(row['Is Active'], true),
          is_delegatable: this.normalizeBoolean(row['Is Delegatable'], false),
          phase: this.normalizeString(row['Phase']) || 'ga',
        });
      });
    }

    // Parse Permissions sheet
    const permissionsSheet = workbook.Sheets['Permissions'];
    if (permissionsSheet) {
      const permissionsJson = XLSX.utils.sheet_to_json(permissionsSheet) as Record<string, unknown>[];

      permissionsJson.forEach((row, index) => {
        const rowNum = index + 2;

        const action = this.normalizeAction(row['Action'] as string);
        const featureCode = this.normalizeString(row['Feature Code*'] || row['Feature Code']);
        const permissionCode = this.normalizeString(row['Permission Code*'] || row['Permission Code']);
        const displayName = this.normalizeString(row['Display Name*'] || row['Display Name']);

        // Skip empty rows
        if (!featureCode && !permissionCode && action !== 'delete') {
          return;
        }

        // Validate required fields for add/update
        if (action !== 'delete') {
          if (!featureCode) {
            validationErrors.push({ sheet: 'Permissions', row: rowNum, field: 'Feature Code', message: 'Feature Code is required' });
          }
          if (!permissionCode) {
            validationErrors.push({ sheet: 'Permissions', row: rowNum, field: 'Permission Code', message: 'Permission Code is required' });
          } else if (!/^[a-z_]+:[a-z_]+$/.test(permissionCode)) {
            validationErrors.push({ sheet: 'Permissions', row: rowNum, field: 'Permission Code', message: 'Permission Code must be in format category:action (lowercase with underscores)' });
          }
          if (!displayName) {
            validationErrors.push({ sheet: 'Permissions', row: rowNum, field: 'Display Name', message: 'Display Name is required' });
          }
        }

        // Validate ID for update/delete
        if ((action === 'update' || action === 'delete') && !row['ID']) {
          validationErrors.push({ sheet: 'Permissions', row: rowNum, field: 'ID', message: 'ID is required for update/delete' });
        }

        importData.permissions.push({
          action,
          id: this.normalizeString(row['ID']),
          feature_code: featureCode,
          permission_code: permissionCode,
          display_name: displayName,
          description: this.normalizeString(row['Description']),
          is_required: this.normalizeBoolean(row['Is Required'], true),
          display_order: this.normalizeNumber(row['Display Order'], 0),
        });
      });
    }

    // Parse Role Templates sheet
    const roleTemplatesSheet = workbook.Sheets['Role Templates'];
    if (roleTemplatesSheet) {
      const roleTemplatesJson = XLSX.utils.sheet_to_json(roleTemplatesSheet) as Record<string, unknown>[];

      roleTemplatesJson.forEach((row, index) => {
        const rowNum = index + 2;

        const action = this.normalizeAction(row['Action'] as string);
        const featureCode = this.normalizeString(row['Feature Code*'] || row['Feature Code']);
        const permissionCode = this.normalizeString(row['Permission Code*'] || row['Permission Code']);
        const roleKey = this.normalizeString(row['Role Key*'] || row['Role Key']);

        // Skip empty rows
        if (!featureCode && !permissionCode && !roleKey && action !== 'delete') {
          return;
        }

        // Validate required fields for add/update
        if (action !== 'delete') {
          if (!featureCode) {
            validationErrors.push({ sheet: 'Role Templates', row: rowNum, field: 'Feature Code', message: 'Feature Code is required' });
          }
          if (!permissionCode) {
            validationErrors.push({ sheet: 'Role Templates', row: rowNum, field: 'Permission Code', message: 'Permission Code is required' });
          }
          if (!roleKey) {
            validationErrors.push({ sheet: 'Role Templates', row: rowNum, field: 'Role Key', message: 'Role Key is required' });
          }
        }

        // Validate ID for update/delete
        if ((action === 'update' || action === 'delete') && !row['ID']) {
          validationErrors.push({ sheet: 'Role Templates', row: rowNum, field: 'ID', message: 'ID is required for update/delete' });
        }

        importData.roleTemplates.push({
          action,
          id: this.normalizeString(row['ID']),
          feature_code: featureCode,
          permission_code: permissionCode,
          role_key: roleKey,
          is_recommended: this.normalizeBoolean(row['Is Recommended'], true),
          reason: this.normalizeString(row['Reason']),
        });
      });
    }

    return { data: importData, errors: validationErrors };
  }

  /**
   * Gets preview result from parsed data
   */
  public getPreviewResult(parsedData: ParsedImportData): ImportPreviewResult {
    const { data, errors } = parsedData;

    return {
      success: errors.length === 0,
      preview: true,
      data: {
        features: data.features.length,
        permissions: data.permissions.length,
        roleTemplates: data.roleTemplates.length,
        breakdown: {
          features: {
            add: data.features.filter(f => f.action === 'add').length,
            update: data.features.filter(f => f.action === 'update').length,
            delete: data.features.filter(f => f.action === 'delete').length,
          },
          permissions: {
            add: data.permissions.filter(p => p.action === 'add').length,
            update: data.permissions.filter(p => p.action === 'update').length,
            delete: data.permissions.filter(p => p.action === 'delete').length,
          },
          roleTemplates: {
            add: data.roleTemplates.filter(r => r.action === 'add').length,
            update: data.roleTemplates.filter(r => r.action === 'update').length,
            delete: data.roleTemplates.filter(r => r.action === 'delete').length,
          },
        },
      },
      errors,
    };
  }

  /**
   * Executes the import via RPC
   */
  public async executeImport(data: ImportData, userId: string): Promise<ImportResult> {
    return this.repository.importBatch(data, userId);
  }

  // Helper methods
  private normalizeString(value: unknown): string {
    if (value === undefined || value === null) return '';
    return String(value).trim();
  }

  private normalizeBoolean(value: unknown, defaultValue: boolean): boolean {
    if (value === undefined || value === null || value === '') return defaultValue;
    const str = String(value).toLowerCase().trim();
    return str === 'true' || str === 'yes' || str === '1';
  }

  private normalizeNumber(value: unknown, defaultValue: number): number {
    if (value === undefined || value === null || value === '') return defaultValue;
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  }

  private normalizeAction(value: unknown): 'add' | 'update' | 'delete' {
    const str = this.normalizeString(value).toLowerCase();
    if (str === 'update') return 'update';
    if (str === 'delete') return 'delete';
    return 'add';
  }
}
