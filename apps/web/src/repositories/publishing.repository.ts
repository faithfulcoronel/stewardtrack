import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import type { IPublishingAdapter } from '@/adapters/publishing.adapter';
import type {
  PublishingJobSnapshot,
  PublishingStatsSnapshot,
  QueuePublishingJobResult,
  TenantPublishingStatusSnapshot,
} from '@/lib/rbac/publishing-store';
import { TYPES } from '@/lib/types';

export interface IPublishingRepository extends BaseRepository<any> {
  getPublishingJobs(tenantId: string): Promise<PublishingJobSnapshot[]>;
  getPublishingStats(tenantId: string): Promise<PublishingStatsSnapshot>;
  getTenantPublishingStatuses(tenantId: string): Promise<TenantPublishingStatusSnapshot[]>;
  queueMetadataCompilationJob(tenantId: string): Promise<QueuePublishingJobResult>;
  queuePermissionSyncJob(tenantId: string): Promise<PublishingJobSnapshot>;
  queueLicenseValidationJob(tenantId: string): Promise<PublishingJobSnapshot>;
  cancelPublishingJob(jobId: string, tenantId: string): Promise<PublishingJobSnapshot>;
  getMetadataPublishingStatus(tenantId: string): Promise<any>;
  compileMetadata(tenantId: string, metadata: any): Promise<any>;
  validateMetadata(tenantId: string, metadata: any): Promise<any>;
  publishMetadata(tenantId: string, metadata: any): Promise<any>;
  getRbacHealthMetrics(tenantId: string): Promise<any>;
  getMaterializedViewStatus(tenantId: string): Promise<any>;
  refreshMaterializedViews(tenantId: string): Promise<any>;
  getMultiRoleStats(tenantId: string): Promise<any>;
  analyzeRoleConflicts(roleIds: string[], tenantId: string): Promise<any>;
}

@injectable()
export class PublishingRepository extends BaseRepository<any> implements IPublishingRepository {
  constructor(@inject(TYPES.IPublishingAdapter) private readonly publishingAdapter: IPublishingAdapter) {
    super(publishingAdapter);
  }

  async getPublishingJobs(tenantId: string): Promise<PublishingJobSnapshot[]> {
    return await this.publishingAdapter.getPublishingJobs(tenantId);
  }

  async getPublishingStats(tenantId: string): Promise<PublishingStatsSnapshot> {
    return await this.publishingAdapter.getPublishingStats(tenantId);
  }

  async getTenantPublishingStatuses(tenantId: string): Promise<TenantPublishingStatusSnapshot[]> {
    return await this.publishingAdapter.getTenantPublishingStatuses(tenantId);
  }

  async queueMetadataCompilationJob(tenantId: string): Promise<QueuePublishingJobResult> {
    return await this.publishingAdapter.queueMetadataCompilationJob(tenantId);
  }

  async queuePermissionSyncJob(tenantId: string): Promise<PublishingJobSnapshot> {
    return await this.publishingAdapter.queuePermissionSyncJob(tenantId);
  }

  async queueLicenseValidationJob(tenantId: string): Promise<PublishingJobSnapshot> {
    return await this.publishingAdapter.queueLicenseValidationJob(tenantId);
  }

  async cancelPublishingJob(jobId: string, tenantId: string): Promise<PublishingJobSnapshot> {
    return await this.publishingAdapter.cancelPublishingJob(jobId, tenantId);
  }

  async getMetadataPublishingStatus(tenantId: string): Promise<any> {
    return await this.publishingAdapter.getMetadataPublishingStatus(tenantId);
  }

  async compileMetadata(tenantId: string, metadata: any): Promise<any> {
    return await this.publishingAdapter.compileMetadata(tenantId, metadata);
  }

  async validateMetadata(tenantId: string, metadata: any): Promise<any> {
    return await this.publishingAdapter.validateMetadata(tenantId, metadata);
  }

  async publishMetadata(tenantId: string, metadata: any): Promise<any> {
    return await this.publishingAdapter.publishMetadata(tenantId, metadata);
  }

  async getRbacHealthMetrics(tenantId: string): Promise<any> {
    return await this.publishingAdapter.getRbacHealthMetrics(tenantId);
  }

  async getMaterializedViewStatus(tenantId: string): Promise<any> {
    return await this.publishingAdapter.getMaterializedViewStatus(tenantId);
  }

  async refreshMaterializedViews(tenantId: string): Promise<any> {
    return await this.publishingAdapter.refreshMaterializedViews(tenantId);
  }

  async getMultiRoleStats(tenantId: string): Promise<any> {
    return await this.publishingAdapter.getMultiRoleStats(tenantId);
  }

  async analyzeRoleConflicts(roleIds: string[], tenantId: string): Promise<any> {
    return await this.publishingAdapter.analyzeRoleConflicts(roleIds, tenantId);
  }
}
