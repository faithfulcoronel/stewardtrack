import 'server-only';
import 'reflect-metadata';
import { injectable } from 'inversify';

// ============================================================================
// Types
// ============================================================================

export interface FeatureImportRow {
  action: 'add' | 'update' | 'delete';
  id?: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  tier?: string;
  is_active: boolean;
  is_delegatable: boolean;
  phase: string;
}

export interface PermissionImportRow {
  action: 'add' | 'update' | 'delete';
  id?: string;
  feature_code: string;
  permission_code: string;
  display_name: string;
  description?: string;
  is_required: boolean;
  display_order: number;
}

export interface RoleTemplateImportRow {
  action: 'add' | 'update' | 'delete';
  id?: string;
  feature_code: string;
  permission_code: string;
  role_key: string;
  is_recommended: boolean;
  reason?: string;
}

export interface ImportData {
  features: FeatureImportRow[];
  permissions: PermissionImportRow[];
  roleTemplates: RoleTemplateImportRow[];
}

export interface ImportResult {
  success: boolean;
  features_added: number;
  features_updated: number;
  features_deleted: number;
  permissions_added: number;
  permissions_updated: number;
  permissions_deleted: number;
  role_templates_added: number;
  role_templates_updated: number;
  role_templates_deleted: number;
  errors: string[];
}

export interface FeatureExportRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  tier: string | null;
  is_active: boolean;
  is_delegatable: boolean;
  phase: string | null;
}

export interface PermissionExportRow {
  id: string;
  permission_code: string;
  display_name: string;
  description: string | null;
  is_required: boolean;
  display_order: number;
  feature: { code: string } | null;
}

export interface RoleTemplateExportRow {
  id: string;
  role_key: string;
  is_recommended: boolean;
  reason: string | null;
  feature_permission: {
    permission_code: string;
    feature: { code: string } | null;
  } | null;
}

export interface ExportData {
  features: FeatureExportRow[];
  permissions: PermissionExportRow[];
  roleTemplates: RoleTemplateExportRow[];
}

// ============================================================================
// Interface
// ============================================================================

export interface IFeatureImportAdapter {
  getExportData(): Promise<ExportData>;
  importBatch(data: ImportData, userId: string): Promise<ImportResult>;
}

// ============================================================================
// Implementation
// ============================================================================

@injectable()
export class FeatureImportAdapter implements IFeatureImportAdapter {
  private async getSupabaseClient() {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server');
    return await createSupabaseServerClient();
  }

  /**
   * Gets all features, permissions, and role templates for export/template download
   */
  public async getExportData(): Promise<ExportData> {
    const supabase = await this.getSupabaseClient();

    // Fetch all features
    const { data: features, error: featuresError } = await supabase
      .from('feature_catalog')
      .select('*')
      .is('deleted_at', null)
      .order('category')
      .order('code');

    if (featuresError) {
      throw new Error(`Failed to fetch features: ${featuresError.message}`);
    }

    // Fetch all permissions with feature codes
    const { data: permissions, error: permissionsError } = await supabase
      .from('feature_permissions')
      .select(`
        *,
        feature:feature_catalog!inner(code)
      `)
      .order('feature_id')
      .order('display_order');

    if (permissionsError) {
      throw new Error(`Failed to fetch permissions: ${permissionsError.message}`);
    }

    // Fetch all role templates with permission and feature codes
    const { data: roleTemplates, error: roleTemplatesError } = await supabase
      .from('permission_role_templates')
      .select(`
        *,
        feature_permission:feature_permissions!inner(
          permission_code,
          feature:feature_catalog!inner(code)
        )
      `)
      .order('feature_permission_id')
      .order('role_key');

    if (roleTemplatesError) {
      throw new Error(`Failed to fetch role templates: ${roleTemplatesError.message}`);
    }

    return {
      features: (features || []) as unknown as FeatureExportRow[],
      permissions: (permissions || []) as unknown as PermissionExportRow[],
      roleTemplates: (roleTemplates || []) as unknown as RoleTemplateExportRow[],
    };
  }

  /**
   * Imports features, permissions, and role templates via RPC
   */
  public async importBatch(data: ImportData, userId: string): Promise<ImportResult> {
    const supabase = await this.getSupabaseClient();

    const { data: result, error: rpcError } = await supabase.rpc('import_features_batch', {
      p_data: data,
      p_user_id: userId,
    });

    if (rpcError) {
      throw new Error(`Failed to import features batch: ${rpcError.message}`);
    }

    if (!result || result.length === 0) {
      throw new Error('Failed to import features batch: no result returned');
    }

    const importResult = result[0] as unknown as ImportResult;
    return importResult;
  }
}
