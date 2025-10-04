import 'server-only';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { TYPES } from '@/lib/types';
import type { AuditService } from '@/services/AuditService';
import {
  cancelPublishingJob as cancelPublishingJobInStore,
  getPublishingJobsSnapshot,
  getPublishingStatsSnapshot,
  getTenantPublishingStatusesSnapshot,
  queuePublishingJob,
  type PublishingJobSnapshot,
  type PublishingStatsSnapshot,
  type QueuePublishingJobResult,
  type TenantPublishingStatusSnapshot,
} from '@/lib/rbac/publishing-store';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface IPublishingAdapter extends IBaseAdapter<any> {
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
export class PublishingAdapter extends BaseAdapter<any> implements IPublishingAdapter {
  constructor(
    @inject(TYPES.AuditService) private auditService: AuditService
  ) {
    super();
  }

  protected tableName = 'metadata_surfaces';
  protected defaultSelect = `*`;

  async getPublishingJobs(tenantId: string): Promise<PublishingJobSnapshot[]> {
    return getPublishingJobsSnapshot(tenantId);
  }

  async getPublishingStats(tenantId: string): Promise<PublishingStatsSnapshot> {
    return getPublishingStatsSnapshot(tenantId);
  }

  async getTenantPublishingStatuses(tenantId: string): Promise<TenantPublishingStatusSnapshot[]> {
    return getTenantPublishingStatusesSnapshot(tenantId);
  }

  async queueMetadataCompilationJob(tenantId: string): Promise<QueuePublishingJobResult> {
    return queuePublishingJob({
      tenantId,
      type: 'metadata_compilation',
      metadata: {
        tenant_id: tenantId,
        scope: 'global',
      },
    });
  }

  async queuePermissionSyncJob(tenantId: string): Promise<PublishingJobSnapshot> {
    const { job } = queuePublishingJob({
      tenantId,
      type: 'permission_sync',
      metadata: {
        tenant_id: tenantId,
        scope: 'permissions',
      },
    });
    return job;
  }

  async queueLicenseValidationJob(tenantId: string): Promise<PublishingJobSnapshot> {
    const { job } = queuePublishingJob({
      tenantId,
      type: 'license_validation',
      metadata: {
        tenant_id: tenantId,
        scope: 'licenses',
      },
    });
    return job;
  }

  async cancelPublishingJob(jobId: string, tenantId: string): Promise<PublishingJobSnapshot> {
    const job = cancelPublishingJobInStore(jobId);
    if (!job) {
      throw new Error('Publishing job not found');
    }

    if (job.metadata.tenant_id && job.metadata.tenant_id !== tenantId) {
      throw new Error('Publishing job does not belong to tenant');
    }

    return job;
  }

  async getMetadataPublishingStatus(tenantId: string): Promise<any> {
    const jobs = getPublishingJobsSnapshot(tenantId);
    const stats = getPublishingStatsSnapshot(tenantId);

    const queueJobs = jobs.filter((job) => job.status === 'pending' || job.status === 'running');
    const completedJobs = jobs.filter((job) => job.completed_at);

    const toAction = (job: PublishingJobSnapshot): string => {
      switch (job.type) {
        case 'metadata_compilation':
          return job.status === 'completed' ? 'PUBLISH_METADATA' : 'COMPILE_METADATA';
        case 'permission_sync':
          return 'SYNC_PERMISSIONS';
        case 'surface_binding_update':
          return 'UPDATE_SURFACE_BINDINGS';
        case 'license_validation':
          return 'VALIDATE_LICENSES';
        default:
          return job.type.toUpperCase();
      }
    };

    const queue = queueJobs.map((job) => ({
      action: toAction(job),
      timestamp: job.started_at ?? new Date().toISOString(),
      status: job.status,
      notes: job.metadata.scope ? 'Scope: ' + job.metadata.scope : undefined,
    }));

    const history = jobs
      .map((job) => {
        const status = job.status === 'completed' ? 'success' : job.status === 'failed' ? 'failed' : job.status;
        const duration = job.started_at && job.completed_at
          ? Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000)
          : null;
        const notes = job.error_message
          ? job.error_message
          : 'Processed ' + job.metadata.processed_count + '/' + job.metadata.entity_count + ' entities';

        return {
          action: toAction(job),
          timestamp: job.completed_at ?? job.started_at ?? new Date().toISOString(),
          status,
          duration,
          notes,
          details: job,
        };
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const lastPublishEntry = history.find((item) => item.action === 'PUBLISH_METADATA' && item.status === 'success');

    const hasFailures = history.some((item) => item.status === 'failed');
    const systemStatus = hasFailures ? 'error' : queue.length > 0 ? 'warning' : 'healthy';
    const pendingChanges = Math.max(stats.runningJobs, queue.filter((item) => item.action === 'COMPILE_METADATA').length);

    return {
      systemStatus,
      lastPublish: lastPublishEntry?.timestamp ?? null,
      pendingChanges,
      publishingQueue: queue,
      publishingHistory: history,
      compilerStatus: {
        available: true,
        version: '1.0.0',
        lastHealthCheck: completedJobs[0]?.completed_at ?? new Date().toISOString(),
      },
    };
  }

  async compileMetadata(tenantId: string, metadata: any): Promise<any> {
    // Mock compilation process
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate compilation time

    return {
      success: true,
      compilationId: `comp_${Date.now()}`,
      compiledSurfaces: metadata?.keys || ['admin-security/rbac-dashboard'],
      warnings: [],
      timestamp: new Date().toISOString()
    };
  }

  async validateMetadata(tenantId: string, metadata: any): Promise<any> {
    // Mock validation process
    const isValid = Math.random() > 0.1; // 90% success rate

    return {
      isValid,
      errors: isValid ? [] : ['Invalid role key reference in surface binding'],
      warnings: isValid ? ['Deprecated permission bundle detected'] : [],
      validatedSurfaces: metadata?.keys || ['admin-security/rbac-dashboard'],
      timestamp: new Date().toISOString()
    };
  }

  async publishMetadata(tenantId: string, metadata: any): Promise<any> {
    // Mock publishing process
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate publishing time

    return {
      success: true,
      deploymentId: `deploy_${Date.now()}`,
      publishedSurfaces: metadata?.keys || ['admin-security/rbac-dashboard'],
      rollbackId: `rollback_${Date.now() - 1000}`,
      timestamp: new Date().toISOString()
    };
  }

  async getRbacHealthMetrics(tenantId: string): Promise<any> {
    const supabase = await createSupabaseServerClient();

    try {
      const { data: healthMetrics, error } = await supabase
        .rpc('get_rbac_health_metrics', { target_tenant_id: tenantId });

      if (error) {
        console.error('Error fetching RBAC health metrics:', error);
        throw new Error('Failed to fetch RBAC health metrics');
      }

      // Transform to structured object
      const metrics = healthMetrics?.reduce((acc: any, metric: any) => {
        acc[metric.metric_name] = {
          value: metric.metric_value,
          status: metric.status,
          details: metric.details
        };
        return acc;
      }, {});

      return {
        systemHealth: metrics?.orphaned_user_roles?.status === 'healthy' &&
                     metrics?.roles_without_permissions?.status === 'healthy' ? 'healthy' : 'warning',
        metrics,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error in getRbacHealthMetrics:', error);
      // Return mock data for development
      return {
        systemHealth: 'healthy',
        metrics: {
          orphaned_user_roles: { value: 0, status: 'healthy', details: { count: 0 } },
          users_without_roles: { value: 2, status: 'info', details: { count: 2 } },
          roles_without_permissions: { value: 0, status: 'healthy', details: { count: 0 } },
          materialized_view_lag_minutes: { value: 5, status: 'healthy', details: { lag_seconds: 300 } },
          recent_critical_changes_24h: { value: 3, status: 'healthy', details: { count: 3 } }
        },
        lastUpdated: new Date().toISOString()
      };
    }
  }

  async getMaterializedViewStatus(tenantId: string): Promise<any> {
    const supabase = await createSupabaseServerClient();

    try {
      // Get materialized view refresh status from audit logs
      const { data: refreshLogs, error } = await supabase
        .from('rbac_audit_log')
        .select('*')
        .eq('table_name', 'tenant_user_effective_permissions')
        .eq('operation', 'REFRESH')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching materialized view status:', error);
      }

      const latestRefresh = refreshLogs?.[0];
      const refreshHistory = refreshLogs?.map(log => ({
        timestamp: log.created_at,
        duration: log.new_values?.duration_ms || null,
        status: log.security_impact === 'low' ? 'success' : 'failed',
        notes: log.notes
      })) || [];

      // Get current view freshness
      const { data: viewData, error: viewError } = await supabase
        .from('tenant_user_effective_permissions')
        .select('computed_at')
        .eq('tenant_id', tenantId)
        .order('computed_at', { ascending: false })
        .limit(1);

      const lastComputed = viewData?.[0]?.computed_at;
      const lagMinutes = lastComputed ?
        Math.floor((Date.now() - new Date(lastComputed).getTime()) / (1000 * 60)) : null;

      return {
        currentStatus: lagMinutes && lagMinutes < 15 ? 'healthy' : 'warning',
        lastRefresh: latestRefresh?.created_at || null,
        lagMinutes,
        refreshHistory,
        viewFreshness: lastComputed,
        performanceMetrics: {
          averageRefreshTime: refreshHistory
            .filter(r => r.duration)
            .reduce((sum, r) => sum + (r.duration || 0), 0) / Math.max(refreshHistory.length, 1),
          successRate: refreshHistory.length > 0 ?
            (refreshHistory.filter(r => r.status === 'success').length / refreshHistory.length) * 100 : 100
        }
      };
    } catch (error) {
      console.error('Error in getMaterializedViewStatus:', error);
      // Return mock data for development
      return {
        currentStatus: 'healthy',
        lastRefresh: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        lagMinutes: 5,
        refreshHistory: [
          {
            timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            duration: 1250,
            status: 'success',
            notes: 'Materialized view refresh completed successfully'
          },
          {
            timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
            duration: 980,
            status: 'success',
            notes: 'Materialized view refresh completed successfully'
          }
        ],
        viewFreshness: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        performanceMetrics: {
          averageRefreshTime: 1115,
          successRate: 100
        }
      };
    }
  }

  async refreshMaterializedViews(tenantId: string): Promise<any> {
    const supabase = await createSupabaseServerClient();

    try {
      const { data, error } = await supabase
        .rpc('refresh_tenant_user_effective_permissions_safe');

      if (error) {
        console.error('Error refreshing materialized views:', error);
        throw new Error('Failed to refresh materialized views');
      }

      return {
        success: true,
        message: 'Materialized views refreshed successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error in refreshMaterializedViews:', error);
      // Simulate success for development
      return {
        success: true,
        message: 'Materialized views refresh initiated (development mode)',
        timestamp: new Date().toISOString()
      };
    }
  }

  async getMultiRoleStats(tenantId: string): Promise<any> {
    const supabase = await this.getSupabaseClient();

    try {
      // Get total users in tenant
      const { count: totalUsers, error: usersError } = await supabase
        .from('tenant_users')
        .select('user_id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);

      if (usersError) {
        console.error('Error fetching total users:', usersError);
        throw new Error(`Failed to fetch total users: ${usersError.message}`);
      }

      // Get users with their role counts
      const { data: userRoleCounts, error: roleCountsError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('tenant_id', tenantId);

      if (roleCountsError) {
        console.error('Error fetching user role counts:', roleCountsError);
        throw new Error(`Failed to fetch user role counts: ${roleCountsError.message}`);
      }

      // Calculate statistics
      const roleCountMap = new Map<string, number>();
      userRoleCounts?.forEach((ur) => {
        const count = roleCountMap.get(ur.user_id) || 0;
        roleCountMap.set(ur.user_id, count + 1);
      });

      const usersWithMultipleRoles = Array.from(roleCountMap.values()).filter(count => count > 1).length;
      const totalRoleAssignments = userRoleCounts?.length || 0;
      const maxRolesPerUser = roleCountMap.size > 0 ? Math.max(...Array.from(roleCountMap.values())) : 0;
      const avgRolesPerUser = totalUsers && totalUsers > 0 ? totalRoleAssignments / totalUsers : 0;

      // Potential conflicts: users with 3+ roles
      const potentialConflicts = Array.from(roleCountMap.values()).filter(count => count >= 3).length;

      return {
        total_users: totalUsers || 0,
        users_with_multiple_roles: usersWithMultipleRoles,
        avg_roles_per_user: parseFloat(avgRolesPerUser.toFixed(2)),
        max_roles_per_user: maxRolesPerUser,
        potential_conflicts: potentialConflicts
      };
    } catch (error) {
      console.error('Error in getMultiRoleStats:', error);
      throw error;
    }
  }

  async analyzeRoleConflicts(roleIds: string[], tenantId: string): Promise<any> {
    if (roleIds.length < 2) {
      return { conflicts: [], hasConflicts: false };
    }

    const supabase = await this.getSupabaseClient();

    try {
      const { data, error } = await supabase
        .rpc('analyze_role_conflicts', {
          p_role_ids: roleIds,
          p_tenant_id: tenantId
        });

      if (error) {
        console.error('Error analyzing role conflicts:', error);
        throw new Error('Failed to analyze role conflicts');
      }

      return data || { conflicts: [], hasConflicts: false };
    } catch (error) {
      console.error('Error in analyzeRoleConflicts:', error);
      // Return mock data for development
      return {
        conflicts: [
          {
            role1_id: roleIds[0],
            role2_id: roleIds[1],
            conflict_type: 'scope_mismatch',
            severity: 'medium',
            description: 'Roles operate in different scopes - review for consistency'
          }
        ],
        hasConflicts: true,
        analysisTimestamp: new Date().toISOString()
      };
    }
  }
}
