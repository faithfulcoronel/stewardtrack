import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IKeyResultRepository } from '@/repositories/goals';
import type { IKeyResultProgressUpdateRepository } from '@/repositories/goals';
import type { IMemberRepository } from '@/repositories/member.repository';
import type {
  KeyResult,
  MetricLinkType,
  AvailableMetric,
  ProgressUpdateCreateInput,
} from '@/models/goals';
import { AVAILABLE_METRICS } from '@/models/goals';
import { handleError } from '@/utils/errorHandler';

// ============================================================================
// Service Interface
// ============================================================================

export interface IGoalMetricsService {
  getAvailableMetrics(): AvailableMetric[];
  syncAutoLinkedMetric(keyResultId: string): Promise<KeyResult>;
  syncAllAutoLinkedMetrics(): Promise<{ success: number; failed: number }>;
  fetchMetricValue(metricType: MetricLinkType, config?: Record<string, unknown>): Promise<number>;
}

// ============================================================================
// Service Implementation
// ============================================================================

@injectable()
export class GoalMetricsService implements IGoalMetricsService {
  constructor(
    @inject(TYPES.IKeyResultRepository)
    private keyResultRepo: IKeyResultRepository,
    @inject(TYPES.IKeyResultProgressUpdateRepository)
    private progressUpdateRepo: IKeyResultProgressUpdateRepository,
    @inject(TYPES.IMemberRepository)
    private memberRepo: IMemberRepository
  ) {}

  /**
   * Get list of available metrics for auto-linking
   */
  getAvailableMetrics(): AvailableMetric[] {
    return AVAILABLE_METRICS;
  }

  /**
   * Sync a single auto-linked key result with its source metric
   */
  async syncAutoLinkedMetric(keyResultId: string): Promise<KeyResult> {
    try {
      const keyResult = await this.keyResultRepo.getById(keyResultId);
      if (!keyResult) {
        throw new Error('Key result not found');
      }

      if (keyResult.metric_link_type === 'none') {
        throw new Error('Key result is not auto-linked to a metric');
      }

      // Fetch the current metric value
      const newValue = await this.fetchMetricValue(
        keyResult.metric_link_type,
        keyResult.metric_link_config as Record<string, unknown>
      );

      // Only update if value has changed
      if (newValue !== keyResult.current_value) {
        // Record progress update (auto)
        const progressData: ProgressUpdateCreateInput = {
          key_result_id: keyResultId,
          new_value: newValue,
          notes: `Auto-synced from ${keyResult.metric_link_type}`,
          is_auto_update: true,
          recorded_at: new Date().toISOString(),
        };

        await this.progressUpdateRepo.create(progressData);

        // Mark as auto-updated
        await this.keyResultRepo.markAutoUpdated(keyResultId, newValue);
      }

      return (await this.keyResultRepo.getById(keyResultId))!;
    } catch (error) {
      throw handleError(error, {
        context: 'GoalMetricsService.syncAutoLinkedMetric',
        keyResultId,
      });
    }
  }

  /**
   * Sync all auto-linked key results
   */
  async syncAllAutoLinkedMetrics(): Promise<{ success: number; failed: number }> {
    try {
      // Get all auto-linked key results
      const allKeyResults = await this.keyResultRepo.getAll({ status: 'active' });
      const autoLinkedKRs = allKeyResults.filter(
        (kr) => kr.metric_link_type !== 'none'
      );

      let success = 0;
      let failed = 0;

      for (const kr of autoLinkedKRs) {
        try {
          await this.syncAutoLinkedMetric(kr.id);
          success++;
        } catch {
          failed++;
          console.error(`Failed to sync key result ${kr.id}`);
        }
      }

      return { success, failed };
    } catch (error) {
      throw handleError(error, {
        context: 'GoalMetricsService.syncAllAutoLinkedMetrics',
      });
    }
  }

  /**
   * Fetch the current value of a metric from its source
   */
  async fetchMetricValue(
    metricType: MetricLinkType,
    config: Record<string, unknown> = {}
  ): Promise<number> {
    try {
      switch (metricType) {
        case 'none':
          throw new Error('Cannot fetch value for manual tracking');

        case 'members_total':
          return await this.getMembersTotalCount();

        case 'members_active':
          return await this.getMembersActiveCount();

        case 'members_new':
          return await this.getMembersNewCount(
            config.date_range_start as string,
            config.date_range_end as string
          );

        case 'donations_total':
          return await this.getDonationsTotalAmount(
            config.date_range_start as string,
            config.date_range_end as string
          );

        case 'donations_count':
          return await this.getDonationsCount(
            config.date_range_start as string,
            config.date_range_end as string
          );

        case 'care_plans_active':
          return await this.getActiveCarePlansCount();

        case 'discipleship_enrolled':
          return await this.getDiscipleshipEnrolledCount();

        case 'attendance_average':
          return await this.getAttendanceAverage(
            config.date_range_start as string,
            config.date_range_end as string
          );

        case 'custom_query':
          return await this.executeCustomQuery(config);

        default:
          throw new Error(`Unknown metric type: ${metricType}`);
      }
    } catch (error) {
      throw handleError(error, {
        context: 'GoalMetricsService.fetchMetricValue',
        metricType,
        config,
      });
    }
  }

  // ============================================================================
  // Metric Implementations
  // ============================================================================

  /**
   * Get total member count
   */
  private async getMembersTotalCount(): Promise<number> {
    try {
      const result = await this.memberRepo.find({
        pagination: { page: 1, pageSize: 1 },
        filters: {
          deleted_at: { operator: 'isEmpty', value: true },
        },
      });
      return result.count ?? 0;
    } catch (error) {
      console.error('Failed to get members total count:', error);
      return 0;
    }
  }

  /**
   * Get active member count
   */
  private async getMembersActiveCount(): Promise<number> {
    try {
      const result = await this.memberRepo.find({
        pagination: { page: 1, pageSize: 1 },
        filters: {
          is_active: { operator: 'equals', value: true },
          deleted_at: { operator: 'isEmpty', value: true },
        },
      });
      return result.count ?? 0;
    } catch (error) {
      console.error('Failed to get members active count:', error);
      return 0;
    }
  }

  /**
   * Get new members count within date range
   */
  private async getMembersNewCount(
    startDate?: string,
    _endDate?: string
  ): Promise<number> {
    try {
      const filters: Record<string, unknown> = {
        deleted_at: { operator: 'isEmpty', value: true },
      };

      if (startDate) {
        filters.created_at = { operator: 'gte', value: startDate };
      }

      const result = await this.memberRepo.find({
        pagination: { page: 1, pageSize: 1 },
        filters: filters as Record<string, import('@/lib/repository/query').FilterCondition | import('@/lib/repository/query').FilterCondition[]>,
      });

      // Note: End date filter would need proper implementation in the repository
      return result.count ?? 0;
    } catch (error) {
      console.error('Failed to get new members count:', error);
      return 0;
    }
  }

  /**
   * Get total donations amount within date range
   * Note: This requires the Finance module - returns 0 if not available
   */
  private async getDonationsTotalAmount(
    _startDate?: string,
    _endDate?: string
  ): Promise<number> {
    try {
      // This would integrate with the Finance module when available
      // For now, return 0 as a placeholder
      console.log('Donations integration not yet implemented');
      return 0;
    } catch (error) {
      console.error('Failed to get donations total:', error);
      return 0;
    }
  }

  /**
   * Get donations count (unique donors) within date range
   */
  private async getDonationsCount(
    _startDate?: string,
    _endDate?: string
  ): Promise<number> {
    try {
      // This would integrate with the Finance module when available
      console.log('Donations count integration not yet implemented');
      return 0;
    } catch (error) {
      console.error('Failed to get donations count:', error);
      return 0;
    }
  }

  /**
   * Get active care plans count
   */
  private async getActiveCarePlansCount(): Promise<number> {
    try {
      // This would integrate with the Care Plans module
      // Simplified implementation using direct query
      console.log('Care plans integration - using placeholder');
      return 0;
    } catch (error) {
      console.error('Failed to get active care plans count:', error);
      return 0;
    }
  }

  /**
   * Get discipleship enrolled count
   */
  private async getDiscipleshipEnrolledCount(): Promise<number> {
    try {
      // This would integrate with the Discipleship module
      console.log('Discipleship integration not yet implemented');
      return 0;
    } catch (error) {
      console.error('Failed to get discipleship enrolled count:', error);
      return 0;
    }
  }

  /**
   * Get average weekly attendance
   */
  private async getAttendanceAverage(
    _startDate?: string,
    _endDate?: string
  ): Promise<number> {
    try {
      // This would integrate with the Attendance module when available
      console.log('Attendance integration not yet implemented');
      return 0;
    } catch (error) {
      console.error('Failed to get attendance average:', error);
      return 0;
    }
  }

  /**
   * Execute a custom query for metric value
   */
  private async executeCustomQuery(
    _config: Record<string, unknown>
  ): Promise<number> {
    try {
      // Custom queries would need careful implementation for security
      // For now, this is a placeholder
      console.log('Custom query execution not yet implemented');
      return 0;
    } catch (error) {
      console.error('Failed to execute custom query:', error);
      return 0;
    }
  }
}
