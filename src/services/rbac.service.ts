import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import { RbacCoreService } from '@/services/RbacCoreService';
import { RbacFeatureService } from '@/services/rbacFeature.service';
import { RbacDelegationService } from '@/services/RbacDelegationService';
import { RbacAuditService } from '@/services/RbacAuditService';
import { RbacPublishingService } from '@/services/RbacPublishingService';
import { RbacStatisticsService } from '@/services/RbacStatisticsService';
import { tenantUtils } from '@/utils/tenantUtils';
import type {
  PublishingJobSnapshot,
  PublishingStatsSnapshot,
  QueuePublishingJobResult,
  TenantPublishingStatusSnapshot
} from '@/lib/rbac/publishing-store';
import {
  Role,
  Permission,
  UserRole,
  FeatureCatalog,
  TenantFeatureGrant,
  RoleWithPermissions,
  UserWithRoles,
  CreateRoleDto,
  UpdateRoleDto,
  AssignRoleDto,
  RbacAuditLog,
  DelegatedContext,
  MultiRoleContext
} from '@/models/rbac.model';

/**
 * RbacService - Facade Pattern
 *
 * This service acts as a facade that delegates to specialized RBAC services:
 * - RbacCoreService: Role, permission, and user-role management
 * - RbacFeatureService: Feature catalog and tenant feature grants
 * - RbacDelegationService: Delegation context and permissions
 * - RbacAuditService: Audit logging and compliance reporting
 * - RbacPublishingService: Metadata publishing and job management
 * - RbacStatisticsService: Statistics and dashboard metrics
 *
 * Maintains backward compatibility with all existing method signatures.
 */
@injectable()
export class RbacService {
  constructor(
    @inject(TYPES.RbacCoreService) private coreService: RbacCoreService,
    @inject(TYPES.RbacFeatureService) private featureService: RbacFeatureService,
    @inject(TYPES.RbacDelegationService) private delegationService: RbacDelegationService,
    @inject(TYPES.RbacAuditService) private auditService: RbacAuditService,
    @inject(TYPES.RbacPublishingService) private publishingService: RbacPublishingService,
    @inject(TYPES.RbacStatisticsService) private statisticsService: RbacStatisticsService
  ) {}

  private async resolveTenantId(tenantId?: string): Promise<string> {
    const resolved = tenantId ?? (await tenantUtils.getTenantId());
    return resolved ?? '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID fallback for testing
  }

  // ==================== ROLE MANAGEMENT (RbacCoreService) ====================

  async createRole(data: CreateRoleDto, tenantId?: string): Promise<Role> {
    return this.coreService.createRole(data, tenantId);
  }

  async updateRole(id: string, data: UpdateRoleDto, tenantId?: string): Promise<Role> {
    return this.coreService.updateRole(id, data, tenantId);
  }

  async deleteRole(id: string, tenantId?: string): Promise<void> {
    return this.coreService.deleteRole(id, tenantId);
  }

  async getRoles(tenantId?: string, includeSystem = true): Promise<Role[]> {
    return this.coreService.getRoles(tenantId, includeSystem);
  }

  async getRoleWithPermissions(id: string, tenantId?: string): Promise<RoleWithPermissions | null> {
    return this.coreService.getRoleWithPermissions(id, tenantId);
  }

  // ==================== USER-ROLE ASSIGNMENT (RbacCoreService) ====================

  async assignRole(data: AssignRoleDto, tenantId?: string, assignedBy?: string): Promise<UserRole> {
    return this.coreService.assignRole(data, tenantId, assignedBy);
  }

  async revokeRole(userId: string, roleId: string, tenantId?: string): Promise<void> {
    return this.coreService.revokeRole(userId, roleId, tenantId);
  }

  async getUserRoles(userId: string, tenantId?: string): Promise<Role[]> {
    return this.coreService.getUserRoles(userId, tenantId);
  }

  async getUserWithRoles(userId: string, tenantId?: string): Promise<UserWithRoles | null> {
    return this.coreService.getUserWithRoles(userId, tenantId);
  }

  async getUsersWithRole(roleId: string, tenantId?: string): Promise<any[]> {
    return this.coreService.getUsersWithRole(roleId, tenantId);
  }

  async getUserEffectivePermissions(userId: string, tenantId?: string): Promise<Permission[]> {
    return this.coreService.getUserEffectivePermissions(userId, tenantId);
  }

  // ==================== PERMISSION MANAGEMENT (RbacCoreService) ====================

  async getPermissions(tenantId?: string, module?: string): Promise<Permission[]> {
    return this.coreService.getPermissions(tenantId, module);
  }

  // ==================== FEATURE MANAGEMENT (RbacFeatureService) ====================

  async getFeatureCatalog(): Promise<FeatureCatalog[]> {
    return this.featureService.getFeatureCatalog();
  }

  async getTenantFeatureGrants(tenantId?: string): Promise<TenantFeatureGrant[]> {
    return this.featureService.getTenantFeatureGrants(tenantId);
  }

  async hasFeatureAccess(featureCode: string, tenantId?: string): Promise<boolean> {
    return this.featureService.hasFeatureAccess(featureCode, tenantId);
  }

  async getFeatures(filters?: {
    category?: string;
    phase?: string;
    is_active?: boolean;
  }): Promise<FeatureCatalog[]> {
    return this.featureService.getFeatures(filters);
  }

  async createFeature(data: {
    code: string;
    name: string;
    category: string;
    description?: string;
    phase: string;
    is_delegatable: boolean;
    is_active: boolean;
  }): Promise<FeatureCatalog> {
    return this.featureService.createFeature(data);
  }

  // ==================== AUDIT LOGGING (RbacAuditService) ====================

  async getAuditLogs(tenantId?: string, limit = 100, offset = 0): Promise<RbacAuditLog[]> {
    return this.auditService.getAuditLogs(tenantId, limit, offset);
  }

  // ==================== DELEGATED ACCESS (RbacDelegationService) ====================

  async getDelegatedContext(userId: string, tenantId?: string): Promise<DelegatedContext | null> {
    return this.delegationService.getDelegatedContext(userId, tenantId);
  }

  async getUsersInDelegatedScope(delegatedContext: DelegatedContext): Promise<UserWithRoles[]> {
    return this.delegationService.getUsersInDelegatedScope(delegatedContext);
  }

  async canDelegateRole(userId: string, roleId: string, tenantId?: string): Promise<boolean> {
    return this.delegationService.canDelegateRole(userId, roleId, tenantId);
  }

  // ==================== MULTI-ROLE SUPPORT (RbacCoreService) ====================

  async getUserMultiRoleContext(userId: string, tenantId?: string): Promise<MultiRoleContext | null> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    // This method aggregates data from core service
    const roles = await this.coreService.getUserRoles(userId, effectiveTenantId);
    const permissions = await this.coreService.getUserEffectivePermissions(userId, effectiveTenantId);
    const featureGrants = await this.featureService.getTenantFeatureGrants(effectiveTenantId);

    return {
      user_id: userId,
      tenant_id: effectiveTenantId,
      role_keys: roles.map(r => r.metadata_key).filter(Boolean) as string[],
      effective_permissions: permissions,
      feature_grants: featureGrants
    };
  }

  // ==================== ROLE COMPOSITION WIZARD SUPPORT (RbacCoreService) ====================

  async getPermissionsByModule(tenantId?: string): Promise<Record<string, Permission[]>> {
    return this.coreService.getPermissionsByModule(tenantId);
  }

  // ==================== STATISTICS METHODS (RbacStatisticsService) ====================

  async getRoleStatistics(tenantId?: string, includeSystem = true): Promise<Role[]> {
    return this.statisticsService.getRoleStatistics(tenantId, includeSystem);
  }

  async getDashboardStatistics(tenantId?: string): Promise<{
    totalRoles: number;
    totalUsers: number;
    activeUsers: number;
    systemRoles: number;
    recentChanges: number;
    pendingApprovals: number;
  }> {
    return this.statisticsService.getDashboardStatistics(tenantId);
  }

  // ==================== PHASE D - DELEGATED CONSOLE METHODS (RbacDelegationService) ====================

  async getDelegationScopes(userId: string, tenantId?: string): Promise<any[]> {
    return this.delegationService.getDelegationScopes(userId, tenantId);
  }

  async getDelegatedUsers(userId: string, tenantId?: string): Promise<any[]> {
    return this.delegationService.getDelegatedUsers(userId, tenantId);
  }

  async getDelegationRoles(userId: string, tenantId?: string): Promise<Role[]> {
    return this.delegationService.getDelegationRoles(userId, tenantId);
  }

  async getDelegationStats(userId: string, tenantId?: string): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalRoles: number;
    delegatableRoles: number;
    scopeCount: number;
    recentChanges: number;
  }> {
    return this.delegationService.getDelegationStats(userId, tenantId);
  }

  async assignDelegatedRole(delegatorId: string, payload: { user_id: string; role_id: string; scope_id?: string }, tenantId?: string): Promise<{ success: boolean; assignment: Partial<UserRole> & { scope_id?: string | null } }> {
    return this.delegationService.assignDelegatedRole(delegatorId, payload, tenantId);
  }

  async revokeDelegatedRole(delegatorId: string, payload: { user_id: string; role_id: string }, tenantId?: string): Promise<{ success: boolean }> {
    return this.delegationService.revokeDelegatedRole(delegatorId, payload, tenantId);
  }

  // ==================== MULTI-ROLE ASSIGNMENT METHODS (RbacCoreService) ====================

  async getMultiRoleUsers(tenantId?: string): Promise<any[]> {
    return this.coreService.getMultiRoleUsers(tenantId);
  }

  async removeUserRole(userId: string, roleId: string, tenantId?: string): Promise<any> {
    return this.coreService.removeUserRole(userId, roleId, tenantId);
  }

  async assignMultipleRoles(userId: string, roleIds: string[], overrideConflicts = false, tenantId?: string): Promise<any> {
    return this.coreService.assignMultipleRoles(userId, roleIds, overrideConflicts, tenantId);
  }

  async analyzeRoleConflicts(roleIds: string[]): Promise<any[]> {
    return this.coreService.analyzeRoleConflicts(roleIds);
  }

  // ==================== DELEGATION PERMISSION MANAGEMENT (RbacDelegationService) ====================

  async getDelegationPermissions(tenantId?: string): Promise<any[]> {
    return this.delegationService.getDelegationPermissions(tenantId);
  }

  async createDelegationPermission(permissionData: any, tenantId?: string): Promise<any> {
    return this.delegationService.createDelegationPermission(permissionData, tenantId);
  }

  async updateDelegationPermission(id: string, permissionData: any, tenantId?: string): Promise<any> {
    return this.delegationService.updateDelegationPermission(id, permissionData, tenantId);
  }

  async revokeDelegationPermission(id: string, tenantId?: string): Promise<void> {
    return this.delegationService.revokeDelegationPermission(id, tenantId);
  }

  async getPermissionTemplates(tenantId?: string): Promise<any[]> {
    return this.delegationService.getPermissionTemplates(tenantId);
  }

  async getUsers(tenantId?: string): Promise<any[]> {
    return this.coreService.getUsers(tenantId);
  }

  // ==================== PHASE E - OPERATIONAL DASHBOARDS & AUTOMATION ====================

  // RBAC Health Metrics (RbacPublishingService)
  async getRbacHealthMetrics(tenantId?: string): Promise<any> {
    return this.publishingService.getRbacHealthMetrics(tenantId);
  }

  // Materialized View Monitoring (RbacPublishingService)
  async getMaterializedViewStatus(tenantId?: string): Promise<any> {
    return this.publishingService.getMaterializedViewStatus(tenantId);
  }

  async refreshMaterializedViews(tenantId?: string): Promise<any> {
    return this.publishingService.refreshMaterializedViews(tenantId);
  }

  // Metadata Publishing Controls (RbacPublishingService)
  async getPublishingJobs(tenantId?: string): Promise<PublishingJobSnapshot[]> {
    return this.publishingService.getPublishingJobs(tenantId);
  }

  async getPublishingStats(tenantId?: string): Promise<PublishingStatsSnapshot> {
    return this.publishingService.getPublishingStats(tenantId);
  }

  async getTenantPublishingStatuses(tenantId?: string): Promise<TenantPublishingStatusSnapshot[]> {
    return this.publishingService.getTenantPublishingStatuses(tenantId);
  }

  async queueMetadataCompilationJob(tenantId?: string): Promise<QueuePublishingJobResult> {
    return this.publishingService.queueMetadataCompilationJob(tenantId);
  }

  async queuePermissionSyncJob(tenantId?: string): Promise<PublishingJobSnapshot> {
    return this.publishingService.queuePermissionSyncJob(tenantId);
  }

  async queueLicenseValidationJob(tenantId?: string): Promise<PublishingJobSnapshot> {
    return this.publishingService.queueLicenseValidationJob(tenantId);
  }

  async cancelPublishingJob(jobId: string, tenantId?: string): Promise<PublishingJobSnapshot> {
    return this.publishingService.cancelPublishingJob(jobId, tenantId);
  }

  async getMetadataPublishingStatus(tenantId?: string): Promise<any> {
    return this.publishingService.getMetadataPublishingStatus(tenantId);
  }

  async compileMetadata(tenantId?: string, metadata?: any): Promise<any> {
    return this.publishingService.compileMetadata(tenantId, metadata);
  }

  async validateMetadata(tenantId?: string, metadata?: any): Promise<any> {
    return this.publishingService.validateMetadata(tenantId, metadata);
  }

  async publishMetadata(tenantId?: string, metadata?: any): Promise<any> {
    return this.publishingService.publishMetadata(tenantId, metadata);
  }

  // Enhanced Compliance Features (RbacAuditService)
  async getAuditTimelineForCompliance(tenantId?: string, options?: {
    startDate?: string;
    endDate?: string;
    userId?: string;
    impactLevels?: string[];
    resourceTypes?: string[];
  }): Promise<any> {
    return this.auditService.getAuditTimelineForCompliance(tenantId, options);
  }

  async generateComplianceReport(tenantId?: string, reportType: string = 'access_review'): Promise<any> {
    return this.auditService.generateComplianceReport(tenantId, reportType);
  }

  // Multi-role management methods (RbacPublishingService)
  async getMultiRoleStats(tenantId?: string): Promise<any> {
    return this.publishingService.getMultiRoleStats(tenantId);
  }

  async toggleMultiRoleMode(userId: string, enabled: boolean, tenantId?: string): Promise<any> {
    // This would need implementation in core service
    // For now, return placeholder
    return { success: true, enabled };
  }
}
