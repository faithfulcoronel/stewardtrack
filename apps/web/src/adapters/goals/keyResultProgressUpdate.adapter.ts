/**
 * Key Result Progress Update Adapter
 *
 * Data access layer for progress update records.
 * Handles direct database operations for tracking key result progress over time.
 *
 * @module planner.core
 * @featureCode planner.core
 *
 * @permission key_results:view - Required to read progress updates
 * @permission key_results:manage - Required to record progress updates
 */
import 'server-only';
import 'reflect-metadata';
import { injectable, inject, optional } from 'inversify';
import type { SupabaseClient } from '@supabase/supabase-js';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCachedUserId } from '@/lib/auth/authCache';
import { TYPES } from '@/lib/types';
import type {
  KeyResultProgressUpdate,
  ProgressUpdateCreateInput,
  ProgressUpdateFilters,
  ProgressUpdateQueryOptions,
  ProgressHistorySummary,
} from '@/models/goals';
import type { RequestContext } from '@/lib/server/context';
import { handleError, TenantContextError } from '@/utils/errorHandler';
import { handleSupabaseError } from '@/utils/supabaseErrorHandler';
import { getUserDisplayNameMap } from '@/lib/server/userDisplayName';
import { tenantUtils } from '@/utils/tenantUtils';

// ============================================================================
// Interface
// ============================================================================

export interface IKeyResultProgressUpdateAdapter {
  findAll(
    filters?: ProgressUpdateFilters,
    options?: ProgressUpdateQueryOptions
  ): Promise<{ data: KeyResultProgressUpdate[]; total: number }>;
  findById(id: string): Promise<KeyResultProgressUpdate | null>;
  findByKeyResultId(
    keyResultId: string,
    options?: ProgressUpdateQueryOptions
  ): Promise<KeyResultProgressUpdate[]>;
  create(data: ProgressUpdateCreateInput): Promise<KeyResultProgressUpdate>;
  delete(id: string): Promise<void>;
  getHistorySummary(keyResultId: string): Promise<ProgressHistorySummary>;
  getRecentUpdatesForGoal(goalId: string, limit?: number): Promise<KeyResultProgressUpdate[]>;
}

// ============================================================================
// Implementation
// ============================================================================

@injectable()
export class KeyResultProgressUpdateAdapter implements IKeyResultProgressUpdateAdapter {
  protected tableName = 'key_result_progress_updates';
  protected defaultSelect = '*';
  protected supabase: SupabaseClient | null = null;

  @inject(TYPES.RequestContext) @optional()
  protected context?: RequestContext;

  protected async getSupabaseClient(): Promise<SupabaseClient> {
    if (!this.supabase) {
      this.supabase = await createSupabaseServerClient();
    }
    return this.supabase;
  }

  protected async getUserId(): Promise<string | undefined> {
    if (this.context?.userId) return this.context.userId;
    return getCachedUserId();
  }

  /**
   * Ensure tenant context is available.
   * Follows the same pattern as BaseAdapter.ensureTenantContext()
   */
  protected async ensureTenantContext(): Promise<string> {
    // 1. Check explicit context (set via DI)
    if (this.context?.tenantId) {
      return this.context.tenantId;
    }

    // 2. Fallback to TenantService resolution
    const fallbackTenantId = await tenantUtils.getTenantId();
    if (fallbackTenantId) {
      return fallbackTenantId;
    }

    // 3. No tenant context available
    throw new TenantContextError('No tenant context available');
  }

  /**
   * Find all progress updates with filtering and pagination
   */
  async findAll(
    filters: ProgressUpdateFilters = {},
    options: ProgressUpdateQueryOptions = {}
  ): Promise<{ data: KeyResultProgressUpdate[]; total: number }> {
    try {
      const tenantId = await this.ensureTenantContext();
      const supabase = await this.getSupabaseClient();

      let query = supabase
        .from(this.tableName)
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId);

      // Apply filters
      if (filters.key_result_id) {
        query = query.eq('key_result_id', filters.key_result_id);
      }

      if (filters.is_auto_update !== undefined) {
        query = query.eq('is_auto_update', filters.is_auto_update);
      }

      if (filters.recorded_from) {
        query = query.gte('recorded_at', filters.recorded_from);
      }

      if (filters.recorded_to) {
        query = query.lte('recorded_at', filters.recorded_to);
      }

      if (filters.created_by) {
        query = query.eq('created_by', filters.created_by);
      }

      // Apply sorting (default: newest first)
      const sortOrder = options.sort_order === 'asc' ? true : false;
      query = query.order('recorded_at', { ascending: sortOrder });

      // Apply pagination
      if (options.limit) {
        const offset = options.offset || 0;
        query = query.range(offset, offset + options.limit - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        handleSupabaseError(error);
      }

      // Enrich with user names
      const enrichedData = await this.enrichProgressUpdates((data as unknown as KeyResultProgressUpdate[]) || [], tenantId);

      return {
        data: enrichedData,
        total: count || 0,
      };
    } catch (error) {
      throw handleError(error, {
        context: 'KeyResultProgressUpdateAdapter.findAll',
        filters,
        options,
      });
    }
  }

  /**
   * Find a progress update by ID
   */
  async findById(id: string): Promise<KeyResultProgressUpdate | null> {
    try {
      const tenantId = await this.ensureTenantContext();
      const supabase = await this.getSupabaseClient();

      const { data, error } = await supabase
        .from(this.tableName)
        .select(`
          *,
          key_result:key_results(id, title)
        `)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        handleSupabaseError(error);
      }

      if (!data) return null;

      // Enrich with user name
      const [enriched] = await this.enrichProgressUpdates([data as unknown as KeyResultProgressUpdate], tenantId);

      // Add key result title
      if (enriched && data.key_result) {
        enriched.key_result_title = (data.key_result as { title: string }).title;
      }

      return enriched || null;
    } catch (error) {
      throw handleError(error, {
        context: 'KeyResultProgressUpdateAdapter.findById',
        id,
      });
    }
  }

  /**
   * Find all progress updates for a key result
   */
  async findByKeyResultId(
    keyResultId: string,
    options: ProgressUpdateQueryOptions = {}
  ): Promise<KeyResultProgressUpdate[]> {
    const result = await this.findAll({ key_result_id: keyResultId }, options);
    return result.data;
  }

  /**
   * Create a new progress update
   */
  async create(data: ProgressUpdateCreateInput): Promise<KeyResultProgressUpdate> {
    try {
      const tenantId = await this.ensureTenantContext();
      const userId = await this.getUserId();
      const supabase = await this.getSupabaseClient();

      // Get current value of the key result to calculate change
      const { data: keyResult, error: krError } = await supabase
        .from('key_results')
        .select('current_value')
        .eq('id', data.key_result_id)
        .eq('tenant_id', tenantId)
        .single();

      if (krError) {
        handleSupabaseError(krError);
      }

      const previousValue = keyResult?.current_value || 0;
      const recordedAt = data.recorded_at || new Date().toISOString();

      // Create the progress update
      // Note: change_value is a generated column computed as (new_value - previous_value)
      const { data: created, error } = await supabase
        .from(this.tableName)
        .insert({
          tenant_id: tenantId,
          key_result_id: data.key_result_id,
          previous_value: previousValue,
          new_value: data.new_value,
          notes: data.notes,
          is_auto_update: data.is_auto_update || false,
          recorded_at: recordedAt,
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        handleSupabaseError(error);
      }

      // Update the key result's current value
      // Note: This is done in the service layer or via a database trigger
      // to ensure proper progress recalculation

      return created as unknown as KeyResultProgressUpdate;
    } catch (error) {
      throw handleError(error, {
        context: 'KeyResultProgressUpdateAdapter.create',
        data,
      });
    }
  }

  /**
   * Delete a progress update (hard delete as these are historical records)
   */
  async delete(id: string): Promise<void> {
    try {
      const tenantId = await this.ensureTenantContext();
      const supabase = await this.getSupabaseClient();

      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) {
        handleSupabaseError(error);
      }
    } catch (error) {
      throw handleError(error, {
        context: 'KeyResultProgressUpdateAdapter.delete',
        id,
      });
    }
  }

  /**
   * Get history summary for a key result
   */
  async getHistorySummary(keyResultId: string): Promise<ProgressHistorySummary> {
    try {
      const tenantId = await this.ensureTenantContext();
      const supabase = await this.getSupabaseClient();

      // Get all updates for the key result
      const { data: updates, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('key_result_id', keyResultId)
        .eq('tenant_id', tenantId)
        .order('recorded_at', { ascending: true });

      if (error) {
        handleSupabaseError(error);
      }

      const updatesList = (updates as unknown as KeyResultProgressUpdate[]) || [];

      // Calculate summary statistics
      const totalUpdates = updatesList.length;
      const firstUpdate = updatesList[0];
      const lastUpdate = updatesList[updatesList.length - 1];

      const startingValue = firstUpdate?.previous_value || 0;
      const currentValue = lastUpdate?.new_value || startingValue;
      const totalChange = currentValue - startingValue;
      const averageChange = totalUpdates > 0 ? totalChange / totalUpdates : 0;

      // Count updates this week and this month
      const now = new Date();
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      const updatesThisWeek = updatesList.filter(
        (u) => new Date(u.recorded_at) >= weekAgo
      ).length;
      const updatesThisMonth = updatesList.filter(
        (u) => new Date(u.recorded_at) >= monthAgo
      ).length;

      return {
        key_result_id: keyResultId,
        total_updates: totalUpdates,
        first_update_at: firstUpdate?.recorded_at,
        last_update_at: lastUpdate?.recorded_at,
        starting_value: startingValue,
        current_value: currentValue,
        total_change: totalChange,
        average_change_per_update: averageChange,
        updates_this_week: updatesThisWeek,
        updates_this_month: updatesThisMonth,
      };
    } catch (error) {
      throw handleError(error, {
        context: 'KeyResultProgressUpdateAdapter.getHistorySummary',
        keyResultId,
      });
    }
  }

  /**
   * Get recent progress updates for all key results under a goal
   */
  async getRecentUpdatesForGoal(
    goalId: string,
    limit: number = 10
  ): Promise<KeyResultProgressUpdate[]> {
    try {
      const tenantId = await this.ensureTenantContext();
      const supabase = await this.getSupabaseClient();

      // First get all key result IDs under this goal (direct and via objectives)
      const { data: directKRs } = await supabase
        .from('key_results')
        .select('id')
        .eq('goal_id', goalId)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);

      const { data: objectives } = await supabase
        .from('objectives')
        .select('id')
        .eq('goal_id', goalId)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);

      const objectiveIds = (objectives || []).map((o) => o.id);

      let objectiveKRIds: string[] = [];
      if (objectiveIds.length > 0) {
        const { data: objectiveKRs } = await supabase
          .from('key_results')
          .select('id')
          .in('objective_id', objectiveIds)
          .eq('tenant_id', tenantId)
          .is('deleted_at', null);

        objectiveKRIds = (objectiveKRs || []).map((kr) => kr.id);
      }

      const allKRIds = [
        ...(directKRs || []).map((kr) => kr.id),
        ...objectiveKRIds,
      ];

      if (allKRIds.length === 0) {
        return [];
      }

      // Get recent updates for these key results
      const { data: updates, error } = await supabase
        .from(this.tableName)
        .select(`
          *,
          key_result:key_results(id, title)
        `)
        .in('key_result_id', allKRIds)
        .eq('tenant_id', tenantId)
        .order('recorded_at', { ascending: false })
        .limit(limit);

      if (error) {
        handleSupabaseError(error);
      }

      // Enrich with user names and key result titles
      const enrichedData = await this.enrichProgressUpdates((updates as unknown as KeyResultProgressUpdate[]) || [], tenantId);

      return enrichedData.map((update) => {
        const rawUpdate = updates?.find((u) => u.id === update.id);
        if (rawUpdate?.key_result) {
          update.key_result_title = (rawUpdate.key_result as { title: string }).title;
        }
        return update;
      });
    } catch (error) {
      throw handleError(error, {
        context: 'KeyResultProgressUpdateAdapter.getRecentUpdatesForGoal',
        goalId,
        limit,
      });
    }
  }

  /**
   * Enrich progress updates with user names
   */
  private async enrichProgressUpdates(
    updates: KeyResultProgressUpdate[],
    tenantId: string
  ): Promise<KeyResultProgressUpdate[]> {
    if (updates.length === 0) return updates;

    const supabase = await this.getSupabaseClient();

    // Get user names
    const userIds = updates
      .map((u) => u.created_by)
      .filter((id): id is string => !!id);

    let userNameMap: Record<string, string> = {};
    if (userIds.length > 0) {
      userNameMap = await getUserDisplayNameMap(supabase, tenantId, userIds);
    }

    // Enrich updates
    return updates.map((update) => ({
      ...update,
      created_by_name: update.created_by ? userNameMap[update.created_by] : null,
    }));
  }
}
