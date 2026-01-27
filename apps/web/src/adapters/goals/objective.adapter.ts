/**
 * Objective Adapter
 *
 * Data access layer for objective records.
 * Handles direct database operations for ministry objectives linked to goals.
 *
 * @module planner.core
 * @featureCode planner.core
 *
 * @permission objectives:view - Required to read objective data
 * @permission objectives:manage - Required to create/update objectives
 * @permission objectives:delete - Required to delete objectives
 */
import 'server-only';
import 'reflect-metadata';
import { injectable, inject, optional } from 'inversify';
import type { SupabaseClient } from '@supabase/supabase-js';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCachedUserId } from '@/lib/auth/authCache';
import { TYPES } from '@/lib/types';
import type {
  Objective,
  ObjectiveWithKeyResults,
  ObjectiveCreateInput,
  ObjectiveUpdateInput,
  ObjectiveFilters,
  KeyResult,
} from '@/models/goals';
import type { RequestContext } from '@/lib/server/context';
import { handleError, TenantContextError } from '@/utils/errorHandler';
import { handleSupabaseError } from '@/utils/supabaseErrorHandler';
import { getUserDisplayNameMap } from '@/lib/server/userDisplayName';
import { tenantUtils } from '@/utils/tenantUtils';

// ============================================================================
// Interface
// ============================================================================

export interface IObjectiveAdapter {
  findAll(filters?: ObjectiveFilters): Promise<Objective[]>;
  findById(id: string): Promise<Objective | null>;
  findByIdWithKeyResults(id: string): Promise<ObjectiveWithKeyResults | null>;
  findByGoalId(goalId: string): Promise<Objective[]>;
  create(data: ObjectiveCreateInput): Promise<Objective>;
  update(id: string, data: ObjectiveUpdateInput): Promise<Objective>;
  softDelete(id: string): Promise<void>;
  reorder(id: string, newSortOrder: number): Promise<void>;
  updateProgress(id: string, progress: number): Promise<void>;
}

// ============================================================================
// Implementation
// ============================================================================

@injectable()
export class ObjectiveAdapter implements IObjectiveAdapter {
  protected tableName = 'objectives';
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
   * Find all objectives with filtering
   */
  async findAll(filters: ObjectiveFilters = {}): Promise<Objective[]> {
    try {
      const tenantId = await this.ensureTenantContext();
      const supabase = await this.getSupabaseClient();

      let query = supabase
        .from(this.tableName)
        .select(this.defaultSelect)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);

      // Apply filters
      if (filters.goal_id) {
        query = query.eq('goal_id', filters.goal_id);
      }

      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }

      if (filters.priority) {
        if (Array.isArray(filters.priority)) {
          query = query.in('priority', filters.priority);
        } else {
          query = query.eq('priority', filters.priority);
        }
      }

      if (filters.responsible_id) {
        query = query.eq('responsible_id', filters.responsible_id);
      }

      if (filters.ministry_department) {
        query = query.eq('ministry_department', filters.ministry_department);
      }

      if (filters.due_date_from) {
        query = query.gte('due_date', filters.due_date_from);
      }

      if (filters.due_date_to) {
        query = query.lte('due_date', filters.due_date_to);
      }

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // Order by sort_order then by priority
      query = query
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      const { data, error } = await query;

      if (error) {
        handleSupabaseError(error);
      }

      // Enrich with responsible names and counts
      const enrichedData = await this.enrichObjectives((data as unknown as Objective[]) || [], tenantId);

      return enrichedData;
    } catch (error) {
      throw handleError(error, {
        context: 'ObjectiveAdapter.findAll',
        filters,
      });
    }
  }

  /**
   * Find an objective by ID
   */
  async findById(id: string): Promise<Objective | null> {
    try {
      const tenantId = await this.ensureTenantContext();
      const supabase = await this.getSupabaseClient();

      const { data, error } = await supabase
        .from(this.tableName)
        .select(`
          *,
          goal:goals(id, title)
        `)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        handleSupabaseError(error);
      }

      if (!data) return null;

      // Enrich with responsible name and counts
      const [enriched] = await this.enrichObjectives([data as unknown as Objective], tenantId);

      // Add goal title
      if (enriched && data.goal) {
        enriched.goal_title = (data.goal as { title: string }).title;
      }

      return enriched || null;
    } catch (error) {
      throw handleError(error, {
        context: 'ObjectiveAdapter.findById',
        id,
      });
    }
  }

  /**
   * Find an objective with its key results
   */
  async findByIdWithKeyResults(id: string): Promise<ObjectiveWithKeyResults | null> {
    try {
      const tenantId = await this.ensureTenantContext();
      const supabase = await this.getSupabaseClient();

      const { data, error } = await supabase
        .from(this.tableName)
        .select(`
          *,
          goal:goals(id, title),
          key_results!key_results_objective_id_fkey(
            id,
            tenant_id,
            goal_id,
            objective_id,
            title,
            description,
            metric_type,
            target_value,
            current_value,
            starting_value,
            unit_label,
            progress_percent,
            metric_link_type,
            metric_link_config,
            update_frequency,
            last_updated_at,
            next_update_due,
            status,
            sort_order,
            is_active,
            created_at,
            updated_at
          )
        `)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        handleSupabaseError(error);
      }

      if (!data) return null;

      // Transform to ObjectiveWithKeyResults
      const keyResults = (data.key_results || []) as unknown as KeyResult[];
      const activeKeyResults = keyResults.filter((kr) => kr.is_active);

      // Sort key results by sort_order
      activeKeyResults.sort((a, b) => a.sort_order - b.sort_order);

      // Enrich objective with responsible name
      const [enriched] = await this.enrichObjectives([data as unknown as Objective], tenantId);

      if (enriched && data.goal) {
        enriched.goal_title = (data.goal as { title: string }).title;
      }

      return {
        ...enriched,
        key_results: activeKeyResults,
      } as ObjectiveWithKeyResults;
    } catch (error) {
      throw handleError(error, {
        context: 'ObjectiveAdapter.findByIdWithKeyResults',
        id,
      });
    }
  }

  /**
   * Find all objectives for a goal
   */
  async findByGoalId(goalId: string): Promise<Objective[]> {
    return this.findAll({ goal_id: goalId });
  }

  /**
   * Create a new objective
   */
  async create(data: ObjectiveCreateInput): Promise<Objective> {
    try {
      const tenantId = await this.ensureTenantContext();
      const userId = await this.getUserId();
      const supabase = await this.getSupabaseClient();

      // Get next sort order
      const { data: maxOrderData } = await supabase
        .from(this.tableName)
        .select('sort_order')
        .eq('goal_id', data.goal_id)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single();

      const nextSortOrder = data.sort_order ?? ((maxOrderData?.sort_order || 0) + 1);

      const { data: created, error } = await supabase
        .from(this.tableName)
        .insert({
          tenant_id: tenantId,
          goal_id: data.goal_id,
          title: data.title,
          description: data.description,
          ministry_department: data.ministry_department,
          responsible_id: data.responsible_id,
          status: data.status || 'pending',
          priority: data.priority || 'normal',
          due_date: data.due_date,
          sort_order: nextSortOrder,
          overall_progress: 0,
          is_active: true,
          created_by: userId,
          updated_by: userId,
        })
        .select()
        .single();

      if (error) {
        handleSupabaseError(error);
      }

      return created as unknown as Objective;
    } catch (error) {
      throw handleError(error, {
        context: 'ObjectiveAdapter.create',
        data,
      });
    }
  }

  /**
   * Update an objective
   */
  async update(id: string, data: ObjectiveUpdateInput): Promise<Objective> {
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
      if (data.ministry_department !== undefined) updateData.ministry_department = data.ministry_department;
      if (data.responsible_id !== undefined) updateData.responsible_id = data.responsible_id;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.due_date !== undefined) updateData.due_date = data.due_date;
      if (data.sort_order !== undefined) updateData.sort_order = data.sort_order;

      const { data: updated, error } = await supabase
        .from(this.tableName)
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) {
        handleSupabaseError(error);
      }

      return updated as unknown as Objective;
    } catch (error) {
      throw handleError(error, {
        context: 'ObjectiveAdapter.update',
        id,
        data,
      });
    }
  }

  /**
   * Soft delete an objective
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
        context: 'ObjectiveAdapter.softDelete',
        id,
      });
    }
  }

  /**
   * Reorder an objective
   */
  async reorder(id: string, newSortOrder: number): Promise<void> {
    try {
      const tenantId = await this.ensureTenantContext();
      const supabase = await this.getSupabaseClient();

      const { error } = await supabase
        .from(this.tableName)
        .update({
          sort_order: newSortOrder,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) {
        handleSupabaseError(error);
      }
    } catch (error) {
      throw handleError(error, {
        context: 'ObjectiveAdapter.reorder',
        id,
        newSortOrder,
      });
    }
  }

  /**
   * Update objective progress (called when key results are updated)
   */
  async updateProgress(id: string, progress: number): Promise<void> {
    try {
      const tenantId = await this.ensureTenantContext();
      const supabase = await this.getSupabaseClient();

      const { error } = await supabase
        .from(this.tableName)
        .update({
          overall_progress: progress,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) {
        handleSupabaseError(error);
      }
    } catch (error) {
      throw handleError(error, {
        context: 'ObjectiveAdapter.updateProgress',
        id,
        progress,
      });
    }
  }

  /**
   * Enrich objectives with responsible names and counts
   */
  private async enrichObjectives(
    objectives: Objective[],
    tenantId: string
  ): Promise<Objective[]> {
    if (objectives.length === 0) return objectives;

    const supabase = await this.getSupabaseClient();

    // Get responsible names
    const responsibleIds = objectives
      .map((o) => o.responsible_id)
      .filter((id): id is string => !!id);

    let responsibleNameMap: Record<string, string> = {};
    if (responsibleIds.length > 0) {
      responsibleNameMap = await getUserDisplayNameMap(supabase, tenantId, responsibleIds);
    }

    // Get key results count per objective
    const objectiveIds = objectives.map((o) => o.id);
    const { data: krData } = await supabase
      .from('key_results')
      .select('objective_id')
      .in('objective_id', objectiveIds)
      .is('deleted_at', null);

    const krCounts: Record<string, number> = {};
    if (krData) {
      for (const kr of krData) {
        if (kr.objective_id) {
          krCounts[kr.objective_id] = (krCounts[kr.objective_id] || 0) + 1;
        }
      }
    }

    // Enrich objectives
    return objectives.map((objective) => ({
      ...objective,
      responsible_name: objective.responsible_id
        ? responsibleNameMap[objective.responsible_id]
        : null,
      key_results_count: krCounts[objective.id] || 0,
    }));
  }
}
