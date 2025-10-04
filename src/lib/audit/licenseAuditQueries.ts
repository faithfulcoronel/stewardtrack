import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * License Audit Query Helpers
 *
 * Pre-built queries for common license audit scenarios:
 * - License change history
 * - Role assignment history
 * - Feature grant/revoke tracking
 * - Compliance report generation
 */

export interface LicenseChangeRecord {
  id: string;
  tenant_id: string;
  table_name: string;
  operation: string;
  record_id: string;
  old_values: any;
  new_values: any;
  user_id: string | null;
  created_at: string;
  security_impact: string;
  notes: string | null;
}

export interface RoleAssignmentHistory {
  user_id: string;
  user_email: string;
  role_id: string;
  role_name: string;
  tenant_id: string;
  assigned_at: string;
  assigned_by: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  is_active: boolean;
}

export interface FeatureGrantHistory {
  tenant_id: string;
  feature_id: string;
  feature_name: string;
  granted_at: string;
  granted_by: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  is_active: boolean;
  source: 'product_offering' | 'manual' | 'upgrade';
}

/**
 * Get license change history for a tenant
 */
export async function getLicenseChangeHistory(
  tenantId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
    operation?: 'CREATE' | 'UPDATE' | 'DELETE';
    limit?: number;
  } = {}
): Promise<LicenseChangeRecord[]> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from('rbac_audit_log')
    .select('*')
    .eq('tenant_id', tenantId)
    .in('table_name', [
      'tenant_feature_grants',
      'product_offerings',
      'license_feature_bundles',
      'surface_license_bindings',
    ])
    .order('created_at', { ascending: false });

  if (options.startDate) {
    query = query.gte('created_at', options.startDate.toISOString());
  }

  if (options.endDate) {
    query = query.lte('created_at', options.endDate.toISOString());
  }

  if (options.operation) {
    query = query.eq('operation', options.operation);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching license change history:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get role assignment history for a user
 */
export async function getUserRoleHistory(
  userId: string,
  tenantId?: string
): Promise<RoleAssignmentHistory[]> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from('rbac_audit_log')
    .select('*')
    .eq('table_name', 'user_roles')
    .eq('new_values->>user_id', userId)
    .order('created_at', { ascending: false });

  if (tenantId) {
    query = query.eq('tenant_id', tenantId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching role history:', error);
    throw error;
  }

  // Transform audit records into role history
  const history: RoleAssignmentHistory[] = [];

  for (const record of data || []) {
    const newValues = record.new_values || {};
    const oldValues = record.old_values || {};

    if (record.operation === 'CREATE' || record.operation === 'INSERT') {
      history.push({
        user_id: userId,
        user_email: newValues.user_email || '',
        role_id: newValues.role_id,
        role_name: newValues.role_name || '',
        tenant_id: record.tenant_id,
        assigned_at: record.created_at,
        assigned_by: record.user_id,
        revoked_at: null,
        revoked_by: null,
        is_active: true,
      });
    } else if (record.operation === 'DELETE') {
      history.push({
        user_id: userId,
        user_email: oldValues.user_email || '',
        role_id: oldValues.role_id,
        role_name: oldValues.role_name || '',
        tenant_id: record.tenant_id,
        assigned_at: oldValues.created_at || record.created_at,
        assigned_by: null,
        revoked_at: record.created_at,
        revoked_by: record.user_id,
        is_active: false,
      });
    }
  }

  return history;
}

/**
 * Get feature grant/revoke history for a tenant
 */
export async function getFeatureGrantHistory(
  tenantId: string,
  options: {
    featureId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}
): Promise<FeatureGrantHistory[]> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from('rbac_audit_log')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('table_name', 'tenant_feature_grants')
    .order('created_at', { ascending: false });

  if (options.startDate) {
    query = query.gte('created_at', options.startDate.toISOString());
  }

  if (options.endDate) {
    query = query.lte('created_at', options.endDate.toISOString());
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching feature grant history:', error);
    throw error;
  }

  // Transform audit records into grant history
  const history: FeatureGrantHistory[] = [];

  for (const record of data || []) {
    const newValues = record.new_values || {};
    const oldValues = record.old_values || {};

    if (options.featureId && newValues.feature_id !== options.featureId) {
      continue;
    }

    if (record.operation === 'CREATE' || record.operation === 'GRANT') {
      history.push({
        tenant_id,
        feature_id: newValues.feature_id,
        feature_name: newValues.feature_name || '',
        granted_at: record.created_at,
        granted_by: record.user_id,
        revoked_at: null,
        revoked_by: null,
        is_active: newValues.is_active !== false,
        source: newValues.source || 'manual',
      });
    } else if (record.operation === 'DELETE' || record.operation === 'REVOKE') {
      history.push({
        tenant_id,
        feature_id: oldValues.feature_id,
        feature_name: oldValues.feature_name || '',
        granted_at: oldValues.granted_at || record.created_at,
        granted_by: null,
        revoked_at: record.created_at,
        revoked_by: record.user_id,
        is_active: false,
        source: oldValues.source || 'manual',
      });
    }
  }

  return history;
}

/**
 * Get compliance report for a date range
 */
export async function getComplianceReport(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  license_changes: LicenseChangeRecord[];
  role_assignments: number;
  feature_grants: number;
  security_events: number;
  high_impact_changes: LicenseChangeRecord[];
}> {
  const supabase = await createSupabaseServerClient();

  // Get all license changes
  const license_changes = await getLicenseChangeHistory(tenantId, {
    startDate,
    endDate,
  });

  // Get role assignment count
  const { count: role_assignments } = await supabase
    .from('rbac_audit_log')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('table_name', 'user_roles')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  // Get feature grant count
  const { count: feature_grants } = await supabase
    .from('rbac_audit_log')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('table_name', 'tenant_feature_grants')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  // Get security events count
  const { count: security_events } = await supabase
    .from('rbac_audit_log')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .in('security_impact', ['high', 'critical'])
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  // Get high impact changes
  const high_impact_changes = license_changes.filter(
    change => change.security_impact === 'high' || change.security_impact === 'critical'
  );

  return {
    license_changes,
    role_assignments: role_assignments || 0,
    feature_grants: feature_grants || 0,
    security_events: security_events || 0,
    high_impact_changes,
  };
}

/**
 * Get permission access logs for a user
 */
export async function getUserAccessLog(
  userId: string,
  tenantId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}
): Promise<LicenseChangeRecord[]> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from('rbac_audit_log')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .eq('operation', 'ACCESS')
    .order('created_at', { ascending: false });

  if (options.startDate) {
    query = query.gte('created_at', options.startDate.toISOString());
  }

  if (options.endDate) {
    query = query.lte('created_at', options.endDate.toISOString());
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching access log:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get licensing drift report (surfaces with RBAC access but no license)
 */
export async function getLicensingDriftReport(
  tenantId: string
): Promise<{
  total_surfaces: number;
  licensed_surfaces: number;
  unlicensed_surfaces: number;
  drift_items: Array<{
    surface_id: string;
    surface_title: string;
    required_bundle: string;
    has_license: boolean;
    users_affected: number;
  }>;
}> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc('get_licensing_drift_report', {
    p_tenant_id: tenantId,
  });

  if (error) {
    console.error('Error fetching licensing drift:', error);
    throw error;
  }

  return data || {
    total_surfaces: 0,
    licensed_surfaces: 0,
    unlicensed_surfaces: 0,
    drift_items: [],
  };
}

/**
 * Export audit trail to JSON
 */
export async function exportAuditTrail(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<string> {
  const report = await getComplianceReport(tenantId, startDate, endDate);

  return JSON.stringify(report, null, 2);
}

/**
 * Export audit trail to CSV
 */
export async function exportAuditTrailCSV(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<string> {
  const changes = await getLicenseChangeHistory(tenantId, {
    startDate,
    endDate,
  });

  const headers = [
    'Date',
    'Operation',
    'Table',
    'Record ID',
    'User ID',
    'Security Impact',
    'Changes',
    'Notes',
  ];

  const rows = changes.map(change => [
    change.created_at,
    change.operation,
    change.table_name,
    change.record_id,
    change.user_id || 'system',
    change.security_impact,
    JSON.stringify({ old: change.old_values, new: change.new_values }),
    change.notes || '',
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return csv;
}
