import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IRbacAuditRepository } from '@/repositories/rbacAudit.repository';
import { tenantUtils } from '@/utils/tenantUtils';
import type {
  RbacAuditLog,
  CreateRbacAuditLogInput,
  RbacAuditOperation
} from '@/models/rbac.model';

@injectable()
export class RbacAuditService {
  constructor(
    @inject(TYPES.IRbacAuditRepository)
    private auditRepository: IRbacAuditRepository
  ) {}

  private async resolveTenantId(tenantId?: string): Promise<string> {
    const resolved = tenantId ?? (await tenantUtils.getTenantId());
    return resolved ?? '550e8400-e29b-41d4-a716-446655440000';
  }

  async logAuditEvent(log: {
    tenant_id: string;
    user_id?: string;
    action: string;
    resource_type: string;
    resource_id?: string;
    old_values?: Record<string, unknown>;
    new_values?: Record<string, unknown>;
    ip_address?: string;
    user_agent?: string;
    notes?: string;
  }): Promise<void> {
    try {
      const payload = this.buildAuditLogPayload(log);
      await this.auditRepository.createAuditLog(payload);
    } catch (error) {
      console.error('Failed to log RBAC audit event:', error);
    }
  }

  async getAuditLogs(tenantId?: string, limit = 100, offset = 0): Promise<RbacAuditLog[]> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    return await this.auditRepository.getAuditLogs(effectiveTenantId, limit, offset);
  }

  async getAuditTimelineForCompliance(tenantId?: string, options?: {
    startDate?: string;
    endDate?: string;
    userId?: string;
    impactLevels?: string[];
    resourceTypes?: string[];
  }): Promise<any> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);

    const timeline = await this.auditRepository.getAuditTimelineForCompliance(resolvedTenantId, options);

    return timeline;
  }

  async generateComplianceReport(tenantId?: string, reportType: string = 'access_review'): Promise<any> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    const report = await this.auditRepository.generateComplianceReport(resolvedTenantId, reportType);
    return report;
  }

  private buildAuditLogPayload(log: {
    tenant_id: string;
    user_id?: string;
    action: string;
    resource_type: string;
    resource_id?: string;
    old_values?: Record<string, unknown>;
    new_values?: Record<string, unknown>;
    ip_address?: string;
    user_agent?: string;
    notes?: string;
  }): CreateRbacAuditLogInput {
    const actionLabel = log.action;
    const normalizedAction = actionLabel?.toUpperCase() ?? '';
    const operation = this.mapActionToOperation(normalizedAction);
    const tableName = this.mapResourceToTableName(log.resource_type);
    const resourceIdentifier = log.resource_id ?? null;
    const recordId = this.tryNormalizeUuid(resourceIdentifier);
    const userId = this.tryNormalizeUuid(log.user_id);

    return {
      tenant_id: log.tenant_id,
      table_name: tableName,
      operation,
      record_id: recordId,
      resource_identifier: resourceIdentifier,
      old_values: log.old_values ?? null,
      new_values: log.new_values ?? null,
      user_id: userId,
      ip_address: log.ip_address ?? null,
      user_agent: log.user_agent ?? null,
      security_impact: this.deriveSecurityImpact(normalizedAction),
      action_label: actionLabel,
      notes: log.notes ?? null
    };
  }

  private mapActionToOperation(action: string): RbacAuditOperation {
    const normalized = (action ?? '').toUpperCase();

    if (normalized.startsWith('CREATE')) return 'CREATE';
    if (normalized.startsWith('UPDATE')) return 'UPDATE';
    if (normalized.startsWith('DELETE')) return 'DELETE';
    if (normalized.startsWith('ASSIGN') || normalized.startsWith('GRANT') || normalized.startsWith('ADD')) {
      return 'GRANT';
    }
    if (normalized.startsWith('REVOKE') || normalized.startsWith('REMOVE')) {
      return 'REVOKE';
    }
    if (normalized.startsWith('LOGIN')) return 'LOGIN';
    if (normalized.startsWith('LOGOUT')) return 'LOGOUT';
    if (normalized.startsWith('ACCESS')) return 'ACCESS';
    if (normalized.startsWith('REFRESH')) return 'REFRESH';
    if (normalized.startsWith('ERROR')) return 'ERROR';

    return 'SYSTEM';
  }

  private mapResourceToTableName(resourceType: string): string {
    const normalized = resourceType.toLowerCase();

    switch (normalized) {
      case 'role':
        return 'roles';
      case 'permission_bundle':
        return 'permission_bundles';
      case 'user_role':
        return 'user_roles';
      case 'rbac_surface_binding':
        return 'rbac_surface_bindings';
      default:
        return resourceType;
    }
  }

  private deriveSecurityImpact(action: string): string {
    const normalized = (action ?? '').toUpperCase();

    if (normalized.includes('PERMISSION') || normalized.includes('ROLE')) {
      if (normalized.startsWith('DELETE') || normalized.startsWith('REVOKE') || normalized.startsWith('REMOVE')) {
        return 'high';
      }
      if (normalized.startsWith('ASSIGN') || normalized.startsWith('GRANT') || normalized.startsWith('ADD')) {
        return 'high';
      }
      return 'medium';
    }

    if (normalized.startsWith('DELETE')) {
      return 'high';
    }

    if (normalized.startsWith('CREATE') || normalized.startsWith('UPDATE')) {
      return 'medium';
    }

    return 'low';
  }

  private tryNormalizeUuid(value?: string | null): string | null {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed) ? trimmed : null;
  }
}
