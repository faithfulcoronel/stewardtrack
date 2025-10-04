import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import type {
  LicenseAssignment,
  LicenseAssignmentWithDetails,
  TenantForAssignment,
  AssignmentResult,
  CreateLicenseAssignmentDto,
  LicenseHistoryEntry,
  FeatureChangeSummary,
} from '@/models/licenseAssignment.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export interface ILicenseAssignmentAdapter extends IBaseAdapter<LicenseAssignment> {
  /**
   * Assigns a product offering to a tenant using database function
   */
  assignLicenseToTenant(data: CreateLicenseAssignmentDto): Promise<AssignmentResult>;

  /**
   * Gets all tenants available for license assignment
   */
  getTenantsForAssignment(): Promise<TenantForAssignment[]>;

  /**
   * Gets the license assignment history for a tenant
   */
  getTenantLicenseHistory(tenantId: string): Promise<LicenseHistoryEntry[]>;

  /**
   * Gets a preview of feature changes for an assignment
   */
  getFeatureChangeSummary(
    tenantId: string,
    newOfferingId: string
  ): Promise<FeatureChangeSummary>;

  /**
   * Gets assignment details with related data
   */
  getAssignmentWithDetails(assignmentId: string): Promise<LicenseAssignmentWithDetails | null>;
}

@injectable()
export class LicenseAssignmentAdapter
  extends BaseAdapter<LicenseAssignment>
  implements ILicenseAssignmentAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'license_assignments';

  protected defaultSelect = `
    id,
    tenant_id,
    offering_id,
    previous_offering_id,
    assigned_at,
    assigned_by,
    notes,
    created_at,
    updated_at
  `;

  protected defaultRelationships = [];

  protected override async onAfterCreate(data: LicenseAssignment): Promise<void> {
    await this.auditService.logAuditEvent(
      'create',
      'license_assignment',
      data.id,
      data
    );
  }

  /**
   * Assigns a product offering to a tenant using the database function
   */
  async assignLicenseToTenant(
    data: CreateLicenseAssignmentDto
  ): Promise<AssignmentResult> {
    const supabase = await this.getSupabaseClient();

    const { data: result, error } = await supabase.rpc('assign_license_to_tenant', {
      p_tenant_id: data.tenant_id,
      p_offering_id: data.offering_id,
      p_assigned_by: data.assigned_by,
      p_notes: data.notes || null,
    });

    if (error) {
      throw new Error(`Failed to assign license: ${error.message}`);
    }

    if (!result || result.length === 0) {
      throw new Error('No assignment result returned');
    }

    // Map database result columns (with result_ prefix) to interface
    const dbResult = result[0] as any;
    const assignmentResult: AssignmentResult = {
      assignment_id: dbResult.result_assignment_id,
      tenant_id: dbResult.result_tenant_id,
      offering_id: dbResult.result_offering_id,
      previous_offering_id: dbResult.result_previous_offering_id,
      assigned_at: dbResult.result_assigned_at,
      features_granted: dbResult.result_features_granted,
      features_revoked: dbResult.result_features_revoked,
    };

    // Log the assignment
    await this.auditService.logAuditEvent(
      'assign_license',
      'tenant',
      data.tenant_id,
      {
        offering_id: data.offering_id,
        assigned_by: data.assigned_by,
        notes: data.notes,
      }
    );

    return assignmentResult;
  }

  /**
   * Gets all tenants available for license assignment
   */
  async getTenantsForAssignment(): Promise<TenantForAssignment[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase.rpc('get_all_tenants_for_assignment');

    if (error) {
      throw new Error(`Failed to get tenants for assignment: ${error.message}`);
    }

    return (data || []) as TenantForAssignment[];
  }

  /**
   * Gets the license assignment history for a tenant
   */
  async getTenantLicenseHistory(tenantId: string): Promise<LicenseHistoryEntry[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase.rpc('get_tenant_license_history', {
      p_tenant_id: tenantId,
    });

    if (error) {
      throw new Error(`Failed to get license history: ${error.message}`);
    }

    return (data || []) as LicenseHistoryEntry[];
  }

  /**
   * Gets a preview of feature changes for an assignment
   */
  async getFeatureChangeSummary(
    tenantId: string,
    newOfferingId: string
  ): Promise<FeatureChangeSummary> {
    const supabase = await this.getSupabaseClient();

    // Call the database function that handles RLS properly
    const { data, error } = await supabase.rpc('get_feature_change_summary', {
      p_tenant_id: tenantId,
      p_new_offering_id: newOfferingId,
    });

    if (error) {
      throw new Error(`Failed to get feature change summary: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data returned from feature change summary');
    }

    // Parse the JSON response
    const result = data as {
      currentOfferingId: string | null;
      newOfferingId: string;
      newFeatures: Array<{ id: string; name: string; description: string }>;
      currentFeatures: Array<{ id: string; name: string; description: string }>;
    };

    // Build feature maps for comparison
    const newFeatureIds = result.newFeatures.map((f) => f.id);
    const currentFeatureIds = result.currentFeatures.map((f) => f.id);

    const newFeatureMap = new Map(
      result.newFeatures.map((f) => [f.id, f])
    );
    const currentFeatureMap = new Map(
      result.currentFeatures.map((f) => [f.id, f])
    );

    // Calculate differences
    const features_to_add = newFeatureIds
      .filter((id) => !currentFeatureIds.includes(id))
      .map((id) => newFeatureMap.get(id)!);

    const features_to_remove = currentFeatureIds
      .filter((id) => !newFeatureIds.includes(id))
      .map((id) => currentFeatureMap.get(id)!);

    const features_to_keep = newFeatureIds
      .filter((id) => currentFeatureIds.includes(id))
      .map((id) => newFeatureMap.get(id)!);

    return {
      features_to_add,
      features_to_remove,
      features_to_keep,
    };
  }

  /**
   * Gets assignment details with related data
   */
  async getAssignmentWithDetails(
    assignmentId: string
  ): Promise<LicenseAssignmentWithDetails | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(`
        *,
        product_offerings!offering_id (
          name,
          tier
        ),
        previous_offering:product_offerings!previous_offering_id (
          name
        ),
        assigned_by_user:auth.users!assigned_by (
          email
        )
      `)
      .eq('id', assignmentId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get assignment details: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      tenant_id: data.tenant_id,
      offering_id: data.offering_id,
      previous_offering_id: data.previous_offering_id,
      assigned_at: data.assigned_at,
      assigned_by: data.assigned_by,
      notes: data.notes,
      created_at: data.created_at,
      updated_at: data.updated_at,
      offering_name: data.product_offerings?.name || '',
      offering_tier: data.product_offerings?.tier || '',
      previous_offering_name: data.previous_offering?.name || null,
      assigned_by_email: data.assigned_by_user?.email || null,
    } as LicenseAssignmentWithDetails;
  }
}
