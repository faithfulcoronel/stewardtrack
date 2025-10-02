import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IPublishingRepository } from '@/repositories/publishing.repository';
import { tenantUtils } from '@/utils/tenantUtils';
import type {
  PublishingJobSnapshot,
  PublishingStatsSnapshot,
  QueuePublishingJobResult,
  TenantPublishingStatusSnapshot
} from '@/lib/rbac/publishing-store';

@injectable()
export class RbacPublishingService {
  constructor(
    @inject(TYPES.IPublishingRepository)
    private publishingRepository: IPublishingRepository
  ) {}

  private async resolveTenantId(tenantId?: string): Promise<string> {
    const resolved = tenantId ?? (await tenantUtils.getTenantId());
    return resolved ?? '550e8400-e29b-41d4-a716-446655440000';
  }

  async getPublishingJobs(tenantId?: string): Promise<PublishingJobSnapshot[]> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    return this.publishingRepository.getPublishingJobs(resolvedTenantId);
  }

  async getPublishingStats(tenantId?: string): Promise<PublishingStatsSnapshot> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    return this.publishingRepository.getPublishingStats(resolvedTenantId);
  }

  async getTenantPublishingStatuses(tenantId?: string): Promise<TenantPublishingStatusSnapshot[]> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    return this.publishingRepository.getTenantPublishingStatuses(resolvedTenantId);
  }

  async queueMetadataCompilationJob(tenantId?: string): Promise<QueuePublishingJobResult> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    return await this.publishingRepository.queueMetadataCompilationJob(resolvedTenantId);
  }

  async queuePermissionSyncJob(tenantId?: string): Promise<PublishingJobSnapshot> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    return await this.publishingRepository.queuePermissionSyncJob(resolvedTenantId);
  }

  async queueLicenseValidationJob(tenantId?: string): Promise<PublishingJobSnapshot> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    return await this.publishingRepository.queueLicenseValidationJob(resolvedTenantId);
  }

  async cancelPublishingJob(jobId: string, tenantId?: string): Promise<PublishingJobSnapshot> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    return await this.publishingRepository.cancelPublishingJob(jobId, resolvedTenantId);
  }

  async getMetadataPublishingStatus(tenantId?: string): Promise<any> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    return await this.publishingRepository.getMetadataPublishingStatus(resolvedTenantId);
  }

  async compileMetadata(tenantId?: string, metadata?: any): Promise<any> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    return await this.publishingRepository.compileMetadata(resolvedTenantId, metadata);
  }

  async validateMetadata(tenantId?: string, metadata?: any): Promise<any> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    return await this.publishingRepository.validateMetadata(resolvedTenantId, metadata);
  }

  async publishMetadata(tenantId?: string, metadata?: any): Promise<any> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    return await this.publishingRepository.publishMetadata(resolvedTenantId, metadata);
  }

  async getRbacHealthMetrics(tenantId?: string): Promise<any> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    return await this.publishingRepository.getRbacHealthMetrics(resolvedTenantId);
  }

  async getMaterializedViewStatus(tenantId?: string): Promise<any> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    return await this.publishingRepository.getMaterializedViewStatus(resolvedTenantId);
  }

  async refreshMaterializedViews(tenantId?: string): Promise<any> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    return await this.publishingRepository.refreshMaterializedViews(resolvedTenantId);
  }

  async getMultiRoleStats(tenantId?: string): Promise<any> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    return await this.publishingRepository.getMultiRoleStats(resolvedTenantId);
  }

  async analyzeRoleConflicts(roleIds: string[], tenantId?: string): Promise<any[]> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    const result = await this.publishingRepository.analyzeRoleConflicts(roleIds, resolvedTenantId);
    return result.conflicts || [];
  }
}
