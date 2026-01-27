/**
 * Key Result Adapter
 *
 * Data access layer for key result records.
 * Handles direct database operations for measurable key results linked to goals/objectives.
 *
 * @module planner.core
 * @featureCode planner.core
 *
 * @permission key_results:view - Required to read key result data
 * @permission key_results:manage - Required to create/update key results
 * @permission key_results:delete - Required to delete key results
 */
import 'server-only';
import 'reflect-metadata';
import { injectable, inject, optional } from 'inversify';
import type { SupabaseClient } from '@supabase/supabase-js';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCachedUserId } from '@/lib/auth/authCache';
import { TYPES } from '@/lib/types';
import type {
  KeyResult,
  KeyResultCreateInput,
  KeyResultUpdateInput,
  KeyResultFilters,
  KeyResultStatus,
} from '@/models/goals';
import type { RequestContext } from '@/lib/server/context';
import { handleError, TenantContextError } from '@/utils/errorHandler';
import { handleSupabaseError } from '@/utils/supabaseErrorHandler';
import { tenantUtils } from '@/utils/tenantUtils';

// ============================================================================
// Interface
// ============================================================================

export interface IKeyResultAdapter {
  findAll(filters?: KeyResultFilters): Promise<KeyResult[]>;
  findById(id: string): Promise<KeyResult | null>;
  findByGoalId(goalId: string): Promise<KeyResult[]>;
  findByObjectiveId(objectiveId: string): Promise<KeyResult[]>;
  findUpdatesDue(dueBeforeDate: string): Promise<KeyResult[]>;
  findOverdueUpdates(): Promise<KeyResult[]>;
  create(data: KeyResultCreateInput): Promise<KeyResult>;
  update(id: string, data: KeyResultUpdateInput): Promise<KeyResult>;
  updateCurrentValue(id: string, value: number): Promise<KeyResult>;
  softDelete(id: string): Promise<void>;
  reorder(id: string, newSortOrder: number): Promise<void>;
  markAutoUpdated(id: string, value: number): Promise<void>;
}

// ============================================================================
// Implementation
// ============================================================================

@injectable()
export class KeyResultAdapter implements IKeyResultAdapter {
  protected tableName = 'key_results';
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
   * Find all key results with filtering
   */
  async findAll(filters: KeyResultFilters = {}): Promise<KeyResult[]> {
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

      if (filters.objective_id) {
        query = query.eq('objective_id', filters.objective_id);
      }

      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }

      if (filters.metric_type) {
        query = query.eq('metric_type', filters.metric_type);
      }

      if (filters.metric_link_type) {
        query = query.eq('metric_link_type', filters.metric_link_type);
      }

      if (filters.update_due_before) {
        query = query.lte('next_update_due', filters.update_due_before);
      }

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // Order by sort_order
      query = query.order('sort_order', { ascending: true });

      const { data, error } = await query;

      if (error) {
        handleSupabaseError(error);
      }

      // Enrich with parent titles
      return await this.enrichKeyResults((data as unknown as KeyResult[]) || [], tenantId);
    } catch (error) {
      throw handleError(error, {
        context: 'KeyResultAdapter.findAll',
        filters,
      });
    }
  }

  /**
   * Find a key result by ID
   */
  async findById(id: string): Promise<KeyResult | null> {
    try {
      const tenantId = await this.ensureTenantContext();
      const supabase = await this.getSupabaseClient();

      const { data, error } = await supabase
        .from(this.tableName)
        .select(`
          *,
          goal:goals(id, title),
          objective:objectives(id, title)
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

      // Extract parent title
      let parentTitle: string | null = null;
      let parentType: 'goal' | 'objective' | undefined;

      if (data.objective) {
        parentTitle = (data.objective as { title: string }).title;
        parentType = 'objective';
      } else if (data.goal) {
        parentTitle = (data.goal as { title: string }).title;
        parentType = 'goal';
      }

      return {
        ...(data as unknown as KeyResult),
        parent_title: parentTitle,
        parent_type: parentType,
      } as KeyResult;
    } catch (error) {
      throw handleError(error, {
        context: 'KeyResultAdapter.findById',
        id,
      });
    }
  }

  /**
   * Find all key results directly linked to a goal
   */
  async findByGoalId(goalId: string): Promise<KeyResult[]> {
    return this.findAll({ goal_id: goalId });
  }

  /**
   * Find all key results linked to an objective
   */
  async findByObjectiveId(objectiveId: string): Promise<KeyResult[]> {
    return this.findAll({ objective_id: objectiveId });
  }

  /**
   * Find key results with updates due before a certain date
   */
  async findUpdatesDue(dueBeforeDate: string): Promise<KeyResult[]> {
    try {
      const tenantId = await this.ensureTenantContext();
      const supabase = await this.getSupabaseClient();

      const { data, error } = await supabase
        .from(this.tableName)
        .select(this.defaultSelect)
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .is('deleted_at', null)
        .not('next_update_due', 'is', null)
        .lte('next_update_due', dueBeforeDate)
        .order('next_update_due', { ascending: true });

      if (error) {
        handleSupabaseError(error);
      }

      return await this.enrichKeyResults((data as unknown as KeyResult[]) || [], tenantId);
    } catch (error) {
      throw handleError(error, {
        context: 'KeyResultAdapter.findUpdatesDue',
        dueBeforeDate,
      });
    }
  }

  /**
   * Find key results with overdue updates
   */
  async findOverdueUpdates(): Promise<KeyResult[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.findUpdatesDue(today);
  }

  /**
   * Create a new key result
   */
  async create(data: KeyResultCreateInput): Promise<KeyResult> {
    try {
      const tenantId = await this.ensureTenantContext();
      const userId = await this.getUserId();
      const supabase = await this.getSupabaseClient();

      // Determine parent (goal or objective)
      const parentField = data.objective_id ? 'objective_id' : 'goal_id';
      const parentValue = data.objective_id || data.goal_id;

      // Get next sort order
      const { data: maxOrderData } = await supabase
        .from(this.tableName)
        .select('sort_order')
        .eq(parentField, parentValue)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single();

      const nextSortOrder = data.sort_order ?? ((maxOrderData?.sort_order || 0) + 1);

      // Calculate initial next_update_due based on frequency
      const updateFrequency = data.update_frequency || 'monthly';
      const nextUpdateDue = this.calculateNextUpdateDue(new Date(), updateFrequency);

      const { data: created, error } = await supabase
        .from(this.tableName)
        .insert({
          tenant_id: tenantId,
          goal_id: data.goal_id || null,
          objective_id: data.objective_id || null,
          title: data.title,
          description: data.description,
          metric_type: data.metric_type,
          target_value: data.target_value,
          current_value: data.starting_value || 0,
          starting_value: data.starting_value || 0,
          unit_label: data.unit_label,
          metric_link_type: data.metric_link_type || 'none',
          metric_link_config: data.metric_link_config || {},
          update_frequency: updateFrequency,
          next_update_due: nextUpdateDue,
          status: 'active',
          sort_order: nextSortOrder,
          is_active: true,
          created_by: userId,
          updated_by: userId,
        })
        .select()
        .single();

      if (error) {
        handleSupabaseError(error);
      }

      return created as unknown as KeyResult;
    } catch (error) {
      throw handleError(error, {
        context: 'KeyResultAdapter.create',
        data,
      });
    }
  }

  /**
   * Update a key result
   */
  async update(id: string, data: KeyResultUpdateInput): Promise<KeyResult> {
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
      if (data.metric_type !== undefined) updateData.metric_type = data.metric_type;
      if (data.target_value !== undefined) updateData.target_value = data.target_value;
      if (data.current_value !== undefined) updateData.current_value = data.current_value;
      if (data.starting_value !== undefined) updateData.starting_value = data.starting_value;
      if (data.unit_label !== undefined) updateData.unit_label = data.unit_label;
      if (data.metric_link_type !== undefined) updateData.metric_link_type = data.metric_link_type;
      if (data.metric_link_config !== undefined) updateData.metric_link_config = data.metric_link_config;
      if (data.update_frequency !== undefined) {
        updateData.update_frequency = data.update_frequency;
        // Recalculate next_update_due if frequency changed
        updateData.next_update_due = this.calculateNextUpdateDue(new Date(), data.update_frequency);
      }
      if (data.status !== undefined) updateData.status = data.status;
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

      return updated as unknown as KeyResult;
    } catch (error) {
      throw handleError(error, {
        context: 'KeyResultAdapter.update',
        id,
        data,
      });
    }
  }

  /**
   * Update only the current value (used during progress recording)
   */
  async updateCurrentValue(id: string, value: number): Promise<KeyResult> {
    try {
      const tenantId = await this.ensureTenantContext();
      const userId = await this.getUserId();
      const supabase = await this.getSupabaseClient();

      // Get current key result to determine new status
      const { data: current, error: fetchError } = await supabase
        .from(this.tableName)
        .select('target_value, update_frequency')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (fetchError) {
        handleSupabaseError(fetchError);
      }

      // Determine if completed
      let newStatus: KeyResultStatus = 'active';
      if (current && value >= current.target_value) {
        newStatus = 'completed';
      }

      // Calculate next update due
      const nextUpdateDue = this.calculateNextUpdateDue(
        new Date(),
        current?.update_frequency || 'monthly'
      );

      const { data: updated, error } = await supabase
        .from(this.tableName)
        .update({
          current_value: value,
          status: newStatus,
          last_updated_at: new Date().toISOString(),
          next_update_due: newStatus === 'completed' ? null : nextUpdateDue,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) {
        handleSupabaseError(error);
      }

      return updated as unknown as KeyResult;
    } catch (error) {
      throw handleError(error, {
        context: 'KeyResultAdapter.updateCurrentValue',
        id,
        value,
      });
    }
  }

  /**
   * Soft delete a key result
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
        context: 'KeyResultAdapter.softDelete',
        id,
      });
    }
  }

  /**
   * Reorder a key result
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
        context: 'KeyResultAdapter.reorder',
        id,
        newSortOrder,
      });
    }
  }

  /**
   * Mark a key result as auto-updated
   */
  async markAutoUpdated(id: string, value: number): Promise<void> {
    try {
      const tenantId = await this.ensureTenantContext();
      const supabase = await this.getSupabaseClient();

      const { error } = await supabase
        .from(this.tableName)
        .update({
          current_value: value,
          last_auto_update_at: new Date().toISOString(),
          last_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) {
        handleSupabaseError(error);
      }
    } catch (error) {
      throw handleError(error, {
        context: 'KeyResultAdapter.markAutoUpdated',
        id,
        value,
      });
    }
  }

  /**
   * Calculate next update due date based on frequency
   */
  private calculateNextUpdateDue(
    fromDate: Date,
    frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly'
  ): string {
    const nextDate = new Date(fromDate);

    switch (frequency) {
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'biweekly':
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
    }

    return nextDate.toISOString().split('T')[0];
  }

  /**
   * Enrich key results with parent titles
   */
  private async enrichKeyResults(
    keyResults: KeyResult[],
    _tenantId: string
  ): Promise<KeyResult[]> {
    if (keyResults.length === 0) return keyResults;

    const supabase = await this.getSupabaseClient();

    // Get unique goal IDs and objective IDs
    const goalIds = keyResults
      .map((kr) => kr.goal_id)
      .filter((id): id is string => !!id && !keyResults.find((kr) => kr.id === id)?.objective_id);

    const objectiveIds = keyResults
      .map((kr) => kr.objective_id)
      .filter((id): id is string => !!id);

    // Fetch goals
    let goalTitleMap: Record<string, string> = {};
    if (goalIds.length > 0) {
      const { data: goals } = await supabase
        .from('goals')
        .select('id, title')
        .in('id', goalIds);

      if (goals) {
        goalTitleMap = Object.fromEntries(goals.map((g) => [g.id, g.title]));
      }
    }

    // Fetch objectives
    let objectiveTitleMap: Record<string, string> = {};
    if (objectiveIds.length > 0) {
      const { data: objectives } = await supabase
        .from('objectives')
        .select('id, title')
        .in('id', objectiveIds);

      if (objectives) {
        objectiveTitleMap = Object.fromEntries(objectives.map((o) => [o.id, o.title]));
      }
    }

    // Enrich key results
    return keyResults.map((kr) => {
      let parentTitle: string | null = null;
      let parentType: 'goal' | 'objective' | undefined;

      if (kr.objective_id && objectiveTitleMap[kr.objective_id]) {
        parentTitle = objectiveTitleMap[kr.objective_id];
        parentType = 'objective';
      } else if (kr.goal_id && goalTitleMap[kr.goal_id]) {
        parentTitle = goalTitleMap[kr.goal_id];
        parentType = 'goal';
      }

      return {
        ...kr,
        parent_title: parentTitle,
        parent_type: parentType,
      };
    });
  }
}
