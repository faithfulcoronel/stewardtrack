import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import type { IRbacAuditAdapter } from '@/adapters/rbacAudit.adapter';
import type {
  RbacAuditLog,
  CreateRbacAuditLogInput
} from '@/models/rbac.model';
import { TYPES } from '@/lib/types';

export interface IRbacAuditRepository extends BaseRepository<RbacAuditLog> {
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

@injectable()
export class RbacAuditRepository extends BaseRepository<RbacAuditLog> implements IRbacAuditRepository {
  constructor(@inject(TYPES.IRbacAuditAdapter) private readonly rbacAuditAdapter: IRbacAuditAdapter) {
    super(rbacAuditAdapter);
  }

  async createAuditLog(log: CreateRbacAuditLogInput): Promise<void> {
    return await this.rbacAuditAdapter.createAuditLog(log);
  }

  async getAuditLogs(tenantId: string, limit: number = 100, offset: number = 0): Promise<RbacAuditLog[]> {
    return await this.rbacAuditAdapter.getAuditLogs(tenantId, limit, offset);
  }

  async getAuditTimelineForCompliance(tenantId: string, options?: {
    startDate?: string;
    endDate?: string;
    userId?: string;
    impactLevels?: string[];
    resourceTypes?: string[];
  }): Promise<any[]> {
    return await this.rbacAuditAdapter.getAuditTimelineForCompliance(tenantId, options);
  }

  async generateComplianceReport(tenantId: string, reportType: string): Promise<any> {
    return await this.rbacAuditAdapter.generateComplianceReport(tenantId, reportType);
  }
}
