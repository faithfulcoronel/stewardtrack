import 'server-only';
import 'reflect-metadata';
import { injectable, inject, optional } from 'inversify';
import type { SupabaseClient } from '@supabase/supabase-js';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCachedUserId } from '@/lib/auth/authCache';
import { TYPES } from '@/lib/types';
import type {
  Goal,
  GoalCreateInput,
  GoalUpdateInput,
  GoalFilters,
  GoalQueryOptions,
  GoalsDashboardStats,
  GoalActivity,
} from '@/models/goals';
import type { RequestContext } from '@/lib/server/context';
import { handleError, TenantContextError } from '@/utils/errorHandler';
import { handleSupabaseError } from '@/utils/supabaseErrorHandler';
import { getUserDisplayNameMap } from '@/lib/server/userDisplayName';
import { tenantUtils } from '@/utils/tenantUtils';

// ============================================================================
// Interface
// ============================================================================

export interface IGoalAdapter {
  findAll(
    filters?: GoalFilters,
    options?: GoalQueryOptions
  ): Promise<{ data: Goal[]; total: number }>;
  findById(id: string): Promise<Goal | null>;
  create(data: GoalCreateInput): Promise<Goal>;
  update(id: string, data: GoalUpdateInput): Promise<Goal>;
  updateProgress(id: string, progress: number): Promise<void>;
  softDelete(id: string): Promise<void>;
  getDashboardStats(): Promise<GoalsDashboardStats>;
  getRecentActivity(limit?: number): Promise<GoalActivity[]>;
}

// ============================================================================
// Implementation
// ============================================================================

@injectable()
export class GoalAdapter implements IGoalAdapter {
  protected tableName = 'goals';
  protected defaultSelect = `
    *,
    category:goal_categories(*)
  `;
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
   * Find all goals with filtering and pagination
   */
  async findAll(
    filters: GoalFilters = {},
    options: GoalQueryOptions = {}
  ): Promise<{ data: Goal[]; total: number }> {
    try {
      const tenantId = await this.ensureTenantContext();
      const supabase = await this.getSupabaseClient();

      let query = supabase
        .from(this.tableName)
        .select(this.defaultSelect, { count: 'exact' })
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);

      // Apply filters
      if (filters.category_id) {
        query = query.eq('category_id', filters.category_id);
      }

      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }

      if (filters.visibility) {
        query = query.eq('visibility', filters.visibility);
      }

      if (filters.owner_id) {
        query = query.eq('owner_id', filters.owner_id);
      }

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      if (filters.start_date_from) {
        query = query.gte('start_date', filters.start_date_from);
      }

      if (filters.start_date_to) {
        query = query.lte('start_date', filters.start_date_to);
      }

      if (filters.target_date_from) {
        query = query.gte('target_date', filters.target_date_from);
      }

      if (filters.target_date_to) {
        query = query.lte('target_date', filters.target_date_to);
      }

      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }

      // Apply sorting
      const sortColumn = options.sort_by || 'created_at';
      const sortAscending = options.sort_order === 'asc';
      query = query.order(sortColumn, { ascending: sortAscending });

      // Apply pagination
      if (options.limit) {
        const offset = options.offset || 0;
        query = query.range(offset, offset + options.limit - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        handleSupabaseError(error);
      }

      // Enrich with owner names and counts
      const enrichedData = await this.enrichGoals((data as unknown as Goal[]) || [], tenantId, options);

      return {
        data: enrichedData,
        total: count || 0,
      };
    } catch (error) {
      throw handleError(error, {
        context: 'GoalAdapter.findAll',
        filters,
        options,
      });
    }
  }

  /**
   * Find a goal by ID
   */
  async findById(id: string): Promise<Goal | null> {
    try {
      const tenantId = await this.ensureTenantContext();
      const supabase = await this.getSupabaseClient();

      const { data, error } = await supabase
        .from(this.tableName)
        .select(this.defaultSelect)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        handleSupabaseError(error);
      }

      if (!data) return null;

      // Enrich with owner name and counts
      const [enriched] = await this.enrichGoals([data as unknown as Goal], tenantId, {
        include_owner: true,
        include_counts: true,
      });

      return enriched || null;
    } catch (error) {
      throw handleError(error, {
        context: 'GoalAdapter.findById',
        id,
      });
    }
  }

  /**
   * Create a new goal
   */
  async create(data: GoalCreateInput): Promise<Goal> {
    try {
      const tenantId = await this.ensureTenantContext();
      const userId = await this.getUserId();
      const supabase = await this.getSupabaseClient();

      const { data: created, error } = await supabase
        .from(this.tableName)
        .insert({
          tenant_id: tenantId,
          title: data.title,
          description: data.description,
          category_id: data.category_id,
          start_date: data.start_date,
          target_date: data.target_date,
          status: data.status || 'draft',
          owner_id: data.owner_id,
          visibility: data.visibility || 'leadership',
          tags: data.tags || [],
          metadata: data.metadata || {},
          overall_progress: 0,
          is_active: true,
          created_by: userId,
          updated_by: userId,
        })
        .select(this.defaultSelect)
        .single();

      if (error) {
        handleSupabaseError(error);
      }

      return created as unknown as Goal;
    } catch (error) {
      throw handleError(error, {
        context: 'GoalAdapter.create',
        data,
      });
    }
  }

  /**
   * Update a goal
   */
  async update(id: string, data: GoalUpdateInput): Promise<Goal> {
    try {
      const tenantId = await this.ensureTenantContext();
      const userId = await this.getUserId();
      const supabase = await this.getSupabaseClient();

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
        updated_by: userId,
      };

      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.category_id !== undefined) updateData.category_id = data.category_id;
      if (data.start_date !== undefined) updateData.start_date = data.start_date;
      if (data.target_date !== undefined) updateData.target_date = data.target_date;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.owner_id !== undefined) updateData.owner_id = data.owner_id;
      if (data.visibility !== undefined) updateData.visibility = data.visibility;
      if (data.tags !== undefined) updateData.tags = data.tags;
      if (data.metadata !== undefined) updateData.metadata = data.metadata;

      const { data: updated, error } = await supabase
        .from(this.tableName)
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .select(this.defaultSelect)
        .single();

      if (error) {
        handleSupabaseError(error);
      }

      return updated as unknown as Goal;
    } catch (error) {
      throw handleError(error, {
        context: 'GoalAdapter.update',
        id,
        data,
      });
    }
  }

  /**
   * Update goal's overall progress
   */
  async updateProgress(id: string, progress: number): Promise<void> {
    try {
      const tenantId = await this.ensureTenantContext();
      const supabase = await this.getSupabaseClient();

      const { error } = await supabase
        .from(this.tableName)
        .update({
          overall_progress: Math.min(100, Math.max(0, progress)),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);

      if (error) {
        handleSupabaseError(error);
      }
    } catch (error) {
      throw handleError(error, {
        context: 'GoalAdapter.updateProgress',
        id,
        progress,
      });
    }
  }

  /**
   * Soft delete a goal
   */
  async softDelete(id: string): Promise<void> {
    try {
      const tenantId = await this.ensureTenantContext();
      const userId = await this.getUserId();
      const supabase = await this.getSupabaseClient();

      const { error } = await supabase
        .from(this.tableName)
        .update({
          deleted_at: new Date().toISOString(),
          is_active: false,
          updated_by: userId,
        })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) {
        handleSupabaseError(error);
      }
    } catch (error) {
      throw handleError(error, {
        context: 'GoalAdapter.softDelete',
        id,
      });
    }
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<GoalsDashboardStats> {
    try {
      const tenantId = await this.ensureTenantContext();
      const supabase = await this.getSupabaseClient();

      // Get goal counts by status
      const { data: goals, error: goalsError } = await supabase
        .from(this.tableName)
        .select('id, status, overall_progress')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);

      if (goalsError) {
        handleSupabaseError(goalsError);
      }

      // Get key results stats
      const { data: keyResults, error: krError } = await supabase
        .from('key_results')
        .select('id, status, progress_percent, next_update_due')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);

      if (krError) {
        handleSupabaseError(krError);
      }

      // Get recent progress updates count (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count: recentUpdatesCount, error: updatesError } = await supabase
        .from('key_result_progress_updates')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('recorded_at', weekAgo.toISOString());

      if (updatesError) {
        handleSupabaseError(updatesError);
      }

      // Calculate stats
      const goalsList = (goals as Array<{ id: string; status: string; overall_progress: number }>) || [];
      const krList = (keyResults as Array<{ id: string; status: string; progress_percent: number; next_update_due: string | null }>) || [];
      const today = new Date().toISOString().split('T')[0];
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      const weekFromNowStr = weekFromNow.toISOString().split('T')[0];

      const goalsByStatus = {
        draft: 0,
        active: 0,
        on_track: 0,
        at_risk: 0,
        behind: 0,
        completed: 0,
        cancelled: 0,
      };

      let totalProgress = 0;
      for (const goal of goalsList) {
        if (goal.status in goalsByStatus) {
          goalsByStatus[goal.status as keyof typeof goalsByStatus]++;
        }
        totalProgress += goal.overall_progress || 0;
      }

      const healthyGoals = goalsByStatus.on_track + goalsByStatus.completed + goalsByStatus.active;
      const totalGoals = goalsList.length;

      const completedKRs = krList.filter((kr) => kr.status === 'completed').length;
      const atRiskKRs = krList.filter(
        (kr) => kr.status === 'active' && kr.progress_percent < 50
      ).length;

      const updatesDueThisWeek = krList.filter(
        (kr) =>
          kr.status === 'active' &&
          kr.next_update_due &&
          kr.next_update_due >= today &&
          kr.next_update_due <= weekFromNowStr
      ).length;

      const overdueUpdates = krList.filter(
        (kr) => kr.status === 'active' && kr.next_update_due && kr.next_update_due < today
      ).length;

      return {
        total_goals: totalGoals,
        goals_by_status: goalsByStatus,
        average_progress: totalGoals > 0 ? totalProgress / totalGoals : 0,
        goals_on_track_percent: totalGoals > 0 ? (healthyGoals / totalGoals) * 100 : 0,
        total_key_results: krList.length,
        key_results_completed: completedKRs,
        key_results_at_risk: atRiskKRs,
        updates_due_this_week: updatesDueThisWeek,
        overdue_updates: overdueUpdates,
        recent_updates_count: recentUpdatesCount || 0,
      };
    } catch (error) {
      throw handleError(error, {
        context: 'GoalAdapter.getDashboardStats',
      });
    }
  }

  /**
   * Get recent activity
   */
  async getRecentActivity(limit: number = 10): Promise<GoalActivity[]> {
    try {
      const tenantId = await this.ensureTenantContext();
      const supabase = await this.getSupabaseClient();

      // Get recent progress updates
      const { data: updates, error } = await supabase
        .from('key_result_progress_updates')
        .select(
          `
          id,
          new_value,
          previous_value,
          notes,
          recorded_at,
          created_by,
          key_results!inner(
            id,
            title,
            tenant_id
          )
        `
        )
        .eq('tenant_id', tenantId)
        .order('recorded_at', { ascending: false })
        .limit(limit);

      if (error) {
        handleSupabaseError(error);
      }

      type ProgressUpdateRow = {
        id: string;
        new_value: number;
        previous_value: number | null;
        notes: string | null;
        recorded_at: string;
        created_by: string | null;
        key_results: { id: string; title: string; tenant_id: string } | null;
      };

      const typedUpdates = (updates as unknown as ProgressUpdateRow[]) || [];

      // Get user names
      const userIds = typedUpdates
        .map((u) => u.created_by)
        .filter((id): id is string => !!id);
      const userNameMap =
        userIds.length > 0
          ? await getUserDisplayNameMap(supabase, tenantId, userIds)
          : {};

      // Transform to GoalActivity
      const activities: GoalActivity[] = typedUpdates
        .filter((update) => update.key_results !== null)
        .map((update) => ({
        id: update.id,
        type: 'progress_recorded' as const,
        entity_type: 'key_result' as const,
        entity_id: update.key_results!.id,
        entity_title: update.key_results!.title,
        description: `Progress updated: ${update.previous_value || 0} → ${update.new_value}`,
        user_id: update.created_by,
        user_name: update.created_by ? userNameMap[update.created_by] : null,
        timestamp: update.recorded_at,
        metadata: {
          previous_value: update.previous_value,
          new_value: update.new_value,
          notes: update.notes,
        },
      }));

      return activities;
    } catch (error) {
      throw handleError(error, {
        context: 'GoalAdapter.getRecentActivity',
        limit,
      });
    }
  }

  /**
   * Enrich goals with owner names and counts
   */
  private async enrichGoals(
    goals: Goal[],
    tenantId: string,
    options: GoalQueryOptions = {}
  ): Promise<Goal[]> {
    if (goals.length === 0) return goals;

    const supabase = await this.getSupabaseClient();

    // Get owner names if requested
    let ownerNameMap: Record<string, string> = {};
    if (options.include_owner !== false) {
      const ownerIds = goals
        .map((g) => g.owner_id)
        .filter((id): id is string => !!id);
      if (ownerIds.length > 0) {
        ownerNameMap = await getUserDisplayNameMap(supabase, tenantId, ownerIds);
      }
    }

    // Get counts if requested
    let objectivesCounts: Record<string, number> = {};
    let keyResultsCounts: Record<string, number> = {};

    if (options.include_counts !== false) {
      const goalIds = goals.map((g) => g.id);

      // Get objectives count per goal
      const { data: objectivesData } = await supabase
        .from('objectives')
        .select('goal_id')
        .in('goal_id', goalIds)
        .is('deleted_at', null);

      if (objectivesData) {
        for (const obj of objectivesData as Array<{ goal_id: string }>) {
          objectivesCounts[obj.goal_id] = (objectivesCounts[obj.goal_id] || 0) + 1;
        }
      }

      // Get key results count per goal (direct only)
      const { data: krData } = await supabase
        .from('key_results')
        .select('goal_id')
        .in('goal_id', goalIds)
        .is('deleted_at', null);

      if (krData) {
        for (const kr of krData as Array<{ goal_id: string | null }>) {
          if (kr.goal_id) {
            keyResultsCounts[kr.goal_id] = (keyResultsCounts[kr.goal_id] || 0) + 1;
          }
        }
      }
    }

    // Enrich goals
    return goals.map((goal) => ({
      ...goal,
      owner_name: goal.owner_id ? ownerNameMap[goal.owner_id] : null,
      objectives_count: objectivesCounts[goal.id] || 0,
      key_results_count: keyResultsCounts[goal.id] || 0,
    }));
  }
}
