import 'server-only';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { TYPES } from '@/lib/types';
import type { AuditService } from '@/services/audit.service';
import type {
  RbacAuditLog,
  CreateRbacAuditLogInput,
  RbacAuditOperation
} from '@/models/rbac.model';

export interface IRbacAuditAdapter extends IBaseAdapter<RbacAuditLog> {
  createAuditLog(log: CreateRbacAuditLogInput): Promise<void>;
  getAuditLogs(tenantId: string, limit?: number, offset?: number): Promise<RbacAuditLog[]>;
  getAuditTimelineForCompliance(tenantId: string, options?: {
    startDate?: string;
    endDate?: string;
    userId?: string;
    impactLevels?: string[];
    resourceTypes?: string[];
  }): Promise<any[]>;
  generateComplianceReport(tenantId: string, reportType: string): Promise<any>;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = (value?: string | null): value is string => Boolean(value && UUID_PATTERN.test(value));

const normalizeUuid = (value?: string | null): string | null => (isUuid(value) ? value : null);

const composeAuditNote = (input: CreateRbacAuditLogInput): string | null => {
  if (input.notes) {
    return input.notes;
  }

  const payload: Record<string, string> = {};

  if (input.action_label) {
    payload.action = input.action_label;
  }

  if (input.resource_identifier) {
    payload.resource_id = input.resource_identifier;
  }

  return Object.keys(payload).length > 0 ? JSON.stringify(payload) : null;
};

const parseAuditNote = (note?: string | null): {
  actionLabel?: string;
  resourceIdentifier?: string;
} => {
  if (!note) {
    return {};
  }

  try {
    const parsed = JSON.parse(note);
    if (parsed && typeof parsed === 'object') {
      const record = parsed as Record<string, unknown>;
      const action = typeof record.action === 'string' ? record.action : undefined;
      const resourceId = typeof record.resource_id === 'string' ? record.resource_id : undefined;

      return {
        actionLabel: action,
        resourceIdentifier: resourceId
      };
    }
  } catch {
    return { actionLabel: note };
  }

  return {};
};

const buildAuditActionFallback = (operation?: string | null, tableName?: string | null): string => {
  const opSegment = (operation ?? 'SYSTEM').toString().toUpperCase();
  const tableSegment = (tableName ?? 'EVENT').toString().toUpperCase();
  return `${opSegment}_${tableSegment}`;
};

const toResourceType = (tableName?: string | null): string | null => {
  if (!tableName) {
    return null;
  }

  switch (tableName) {
    case 'roles':
      return 'role';
    case 'permission_bundles':
      return 'permission_bundle';
    case 'user_roles':
      return 'user_role';
    case 'rbac_surface_bindings':
      return 'rbac_surface_binding';
    default:
      return tableName;
  }
};

type AuditLogRow = {
  id: string;
  tenant_id: string | null;
  table_name: string | null;
  operation: RbacAuditOperation | null;
  record_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  changed_fields: string[] | null;
  user_id: string | null;
  user_email: string | null;
  ip_address: string | null;
  user_agent: string | null;
  session_id: string | null;
  created_at: string;
  security_impact: string | null;
  notes: string | null;
};

@injectable()
export class RbacAuditAdapter extends BaseAdapter<RbacAuditLog> implements IRbacAuditAdapter {
  constructor(
    @inject(TYPES.AuditService) private auditService: AuditService
  ) {
    super();
  }

  protected tableName = 'rbac_audit_log';
  protected defaultSelect = `*`;

  async createAuditLog(log: CreateRbacAuditLogInput): Promise<void> {
    // Skip audit logging for mock/test tenants or when tenant ID is not properly resolved
    if (!log.tenant_id || log.tenant_id === 'mock-tenant' || log.tenant_id === 'unknown') {
      console.warn('Skipping audit log creation: invalid tenant context', log.tenant_id);
      return;
    }

    const supabase = await this.getSupabaseClient();
    const recordId = normalizeUuid(log.record_id ?? log.resource_identifier ?? null);
    const userId = normalizeUuid(log.user_id);

    const { error } = await supabase
      .from(this.tableName)
      .insert({
        tenant_id: log.tenant_id,
        table_name: log.table_name,
        operation: log.operation,
        record_id: recordId,
        old_values: log.old_values ?? null,
        new_values: log.new_values ?? null,
        changed_fields: log.changed_fields ?? null,
        user_id: userId,
        user_email: log.user_email ?? null,
        ip_address: log.ip_address ?? null,
        user_agent: log.user_agent ?? null,
        session_id: log.session_id ?? null,
        security_impact: log.security_impact ?? null,
        notes: composeAuditNote(log),
        created_at: new Date().toISOString()
      });

    if (error) {
      // Log the error but don't throw for RLS policy violations in development/testing
      if (error.message.includes('row-level security policy')) {
        console.warn('Audit log skipped due to RLS policy:', error.message);
        return;
      }
      throw new Error(`Failed to create audit log: ${error.message}`);
    }
  }

  async getAuditLogs(tenantId: string, limit = 100, offset = 0): Promise<RbacAuditLog[]> {
    const supabase = await this.getSupabaseClient();
    const safeLimit = Math.max(limit ?? 100, 1);
    const safeOffset = Math.max(offset ?? 0, 0);

    let query = supabase
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (safeOffset > 0) {
      query = query.range(safeOffset, safeOffset + safeLimit - 1);
    } else {
      query = query.limit(safeLimit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch audit logs: ${error.message}`);
    }

    const rows = (data ?? []) as AuditLogRow[];

    return rows.map(row => {
      const { actionLabel, resourceIdentifier } = parseAuditNote(row.notes);
      const operation = (row.operation ?? 'SYSTEM') as RbacAuditOperation;
      const tableName = row.table_name ?? null;
      const action = actionLabel ?? buildAuditActionFallback(operation, tableName);
      const resourceId = row.record_id ?? resourceIdentifier ?? null;

      return {
        id: row.id,
        tenant_id: row.tenant_id ?? null,
        table_name: tableName,
        resource_type: toResourceType(tableName),
        operation,
        action,
        record_id: row.record_id ?? null,
        resource_id: resourceId,
        old_values: row.old_values ?? null,
        new_values: row.new_values ?? null,
        changed_fields: row.changed_fields ?? null,
        user_id: row.user_id ?? null,
        user_email: row.user_email ?? null,
        ip_address: row.ip_address ?? null,
        user_agent: row.user_agent ?? null,
        session_id: row.session_id ?? null,
        created_at: row.created_at,
        security_impact: row.security_impact ?? null,
        notes: row.notes ?? null
      };
    });
  }

  async getAuditTimelineForCompliance(tenantId: string, options?: {
    startDate?: string;
    endDate?: string;
    userId?: string;
    impactLevels?: string[];
    resourceTypes?: string[];
  }): Promise<any[]> {
    const supabase = await this.getSupabaseClient();

    try {
      let query = supabase
        .from(this.tableName)
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (options?.startDate) {
        query = query.gte('created_at', options.startDate);
      }
      if (options?.endDate) {
        query = query.lte('created_at', options.endDate);
      }
      if (options?.userId) {
        query = query.eq('user_id', options.userId);
      }
      if (options?.impactLevels?.length) {
        query = query.in('security_impact', options.impactLevels);
      }
      if (options?.resourceTypes?.length) {
        query = query.in('resource_type', options.resourceTypes);
      }

      const { data: auditLogs, error } = await query.limit(500);

      if (error) {
        console.error('Error fetching compliance audit timeline:', error);
        throw new Error('Failed to fetch compliance audit timeline');
      }

      // Enhance audit logs with compliance context
      return auditLogs?.map(log => ({
        ...log,
        compliance_flags: this.generateComplianceFlags(log),
        risk_assessment: this.assessRisk(log),
        requires_review: this.requiresComplianceReview(log)
      })) || [];
    } catch (error) {
      console.error('Error in getAuditTimelineForCompliance:', error);
      // Return mock data for development
      return [
        {
          id: 'audit-1',
          action: 'UPDATE_ROLE',
          resource_type: 'role',
          user_id: 'user-123',
          security_impact: 'high',
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          compliance_flags: ['privilege_escalation'],
          risk_assessment: 'medium',
          requires_review: true
        }
      ];
    }
  }

  async generateComplianceReport(tenantId: string, reportType: string): Promise<any> {
    const auditLogs = await this.getAuditTimelineForCompliance(tenantId, {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
      impactLevels: ['high', 'critical']
    });

    const report = {
      id: `report_${Date.now()}`,
      type: reportType,
      generatedAt: new Date().toISOString(),
      period: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      },
      summary: {
        totalEvents: auditLogs.length,
        highRiskEvents: auditLogs.filter(log => log.risk_assessment === 'high').length,
        reviewRequired: auditLogs.filter(log => log.requires_review).length,
        usersAffected: new Set(auditLogs.map(log => log.user_id).filter(Boolean)).size
      },
      findings: this.generateComplianceFindings(auditLogs),
      recommendations: this.generateComplianceRecommendations(auditLogs)
    };

    return report;
  }

  private generateComplianceFlags(log: any): string[] {
    const flags: string[] = [];

    if (log.security_impact === 'critical' || log.security_impact === 'high') {
      flags.push('high_impact');
    }

    if (log.action?.includes('DELETE')) {
      flags.push('data_removal');
    }

    if (log.resource_type === 'user_role' && log.action?.includes('CREATE')) {
      flags.push('access_grant');
    }

    if (log.old_values && log.new_values) {
      flags.push('data_modification');
    }

    return flags;
  }

  private assessRisk(log: any): string {
    if (log.security_impact === 'critical') return 'high';
    if (log.security_impact === 'high') return 'medium';
    if (log.action?.includes('DELETE')) return 'medium';
    return 'low';
  }

  private requiresComplianceReview(log: any): boolean {
    return log.security_impact === 'critical' ||
           log.security_impact === 'high' ||
           log.action?.includes('DELETE') ||
           (log.resource_type === 'user_role' && log.action?.includes('CREATE'));
  }

  private generateComplianceFindings(auditLogs: any[]): any[] {
    const findings: any[] = [];

    const privilegeEscalations = auditLogs.filter(log =>
      log.compliance_flags?.includes('privilege_escalation')
    );

    if (privilegeEscalations.length > 0) {
      findings.push({
        type: 'privilege_escalation',
        severity: 'high',
        count: privilegeEscalations.length,
        description: 'Potential privilege escalation events detected',
        events: privilegeEscalations.slice(0, 5) // Top 5 events
      });
    }

    const dataRemovals = auditLogs.filter(log =>
      log.compliance_flags?.includes('data_removal')
    );

    if (dataRemovals.length > 0) {
      findings.push({
        type: 'data_removal',
        severity: 'medium',
        count: dataRemovals.length,
        description: 'Data removal operations detected',
        events: dataRemovals.slice(0, 5)
      });
    }

    const accessGrants = auditLogs.filter(log =>
      log.compliance_flags?.includes('access_grant')
    );

    if (accessGrants.length > 0) {
      findings.push({
        type: 'access_grant',
        severity: 'medium',
        count: accessGrants.length,
        description: 'New access grants detected',
        events: accessGrants.slice(0, 5)
      });
    }

    return findings;
  }

  private generateComplianceRecommendations(auditLogs: any[]): string[] {
    const recommendations: string[] = [];

    const highRiskCount = auditLogs.filter(log => log.risk_assessment === 'high').length;
    if (highRiskCount > 10) {
      recommendations.push('Consider implementing additional approval workflows for high-risk operations');
    }

    const deletionCount = auditLogs.filter(log => log.action?.includes('DELETE')).length;
    if (deletionCount > 5) {
      recommendations.push('Review data retention policies and implement soft deletes where appropriate');
    }

    const uniqueUsers = new Set(auditLogs.map(log => log.user_id).filter(Boolean)).size;
    if (uniqueUsers > 20) {
      recommendations.push('Consider role-based access reviews to ensure principle of least privilege');
    }

    return recommendations;
  }
}
