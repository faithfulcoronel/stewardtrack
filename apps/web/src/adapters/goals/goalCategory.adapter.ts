/**
 * Goal Category Adapter
 *
 * Data access layer for goal category records.
 * Handles direct database operations for goal categorization.
 *
 * @module planner.core
 * @featureCode planner.core
 *
 * @permission goals:view - Required to read category data
 * @permission goals:manage - Required to create/update/delete categories
 */
import 'server-only';
import 'reflect-metadata';
import { injectable, inject, optional } from 'inversify';
import type { SupabaseClient } from '@supabase/supabase-js';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCachedUserId } from '@/lib/auth/authCache';
import { TYPES } from '@/lib/types';
import type {
  GoalCategory,
  GoalCategoryCreateInput,
  GoalCategoryUpdateInput,
} from '@/models/goals';
import type { RequestContext } from '@/lib/server/context';
import { handleError, TenantContextError } from '@/utils/errorHandler';
import { handleSupabaseError } from '@/utils/supabaseErrorHandler';
import { tenantUtils } from '@/utils/tenantUtils';

// ============================================================================
// Interface
// ============================================================================

export interface IGoalCategoryAdapter {
  findAll(): Promise<GoalCategory[]>;
  findById(id: string): Promise<GoalCategory | null>;
  findByCode(code: string): Promise<GoalCategory | null>;
  create(data: GoalCategoryCreateInput): Promise<GoalCategory>;
  update(id: string, data: GoalCategoryUpdateInput): Promise<GoalCategory>;
  softDelete(id: string): Promise<void>;
  isInUse(id: string): Promise<boolean>;
  seedDefaults(): Promise<void>;
}

// ============================================================================
// Implementation
// ============================================================================

@injectable()
export class GoalCategoryAdapter implements IGoalCategoryAdapter {
  protected tableName = 'goal_categories';
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
   * Find all categories for a tenant
   */
  async findAll(): Promise<GoalCategory[]> {
    try {
      const tenantId = await this.ensureTenantContext();
      const supabase = await this.getSupabaseClient();

      const { data, error } = await supabase
        .from(this.tableName)
        .select(this.defaultSelect)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        handleSupabaseError(error);
      }

      return (data as unknown as GoalCategory[]) || [];
    } catch (error) {
      throw handleError(error, {
        context: 'GoalCategoryAdapter.findAll',
      });
    }
  }

  /**
   * Find a category by ID
   */
  async findById(id: string): Promise<GoalCategory | null> {
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

      return data as unknown as GoalCategory | null;
    } catch (error) {
      throw handleError(error, {
        context: 'GoalCategoryAdapter.findById',
        id,
      });
    }
  }

  /**
   * Find a category by code
   */
  async findByCode(code: string): Promise<GoalCategory | null> {
    try {
      const tenantId = await this.ensureTenantContext();
      const supabase = await this.getSupabaseClient();

      const { data, error } = await supabase
        .from(this.tableName)
        .select(this.defaultSelect)
        .eq('code', code)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        handleSupabaseError(error);
      }

      return data as unknown as GoalCategory | null;
    } catch (error) {
      throw handleError(error, {
        context: 'GoalCategoryAdapter.findByCode',
        code,
      });
    }
  }

  /**
   * Create a new category
   */
  async create(data: GoalCategoryCreateInput): Promise<GoalCategory> {
    try {
      const tenantId = await this.ensureTenantContext();
      const userId = await this.getUserId();
      const supabase = await this.getSupabaseClient();

      const { data: created, error } = await supabase
        .from(this.tableName)
        .insert({
          tenant_id: tenantId,
          name: data.name,
          code: data.code,
          description: data.description,
          color: data.color || '#6366f1',
          icon: data.icon || 'target',
          sort_order: data.sort_order || 0,
          is_system: false,
          is_active: true,
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        handleSupabaseError(error);
      }

      return created as unknown as GoalCategory;
    } catch (error) {
      throw handleError(error, {
        context: 'GoalCategoryAdapter.create',
        data,
      });
    }
  }

  /**
   * Update a category
   */
  async update(id: string, data: GoalCategoryUpdateInput): Promise<GoalCategory> {
    try {
      const tenantId = await this.ensureTenantContext();
      const supabase = await this.getSupabaseClient();

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (data.name !== undefined) updateData.name = data.name;
      if (data.code !== undefined) updateData.code = data.code;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.color !== undefined) updateData.color = data.color;
      if (data.icon !== undefined) updateData.icon = data.icon;
      if (data.sort_order !== undefined) updateData.sort_order = data.sort_order;
      if (data.is_active !== undefined) updateData.is_active = data.is_active;

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

      return updated as unknown as GoalCategory;
    } catch (error) {
      throw handleError(error, {
        context: 'GoalCategoryAdapter.update',
        id,
        data,
      });
    }
  }

  /**
   * Soft delete a category
   */
  async softDelete(id: string): Promise<void> {
    try {
      const tenantId = await this.ensureTenantContext();
      const supabase = await this.getSupabaseClient();

      const { error } = await supabase
        .from(this.tableName)
        .update({
          deleted_at: new Date().toISOString(),
          is_active: false,
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .eq('is_system', false); // Cannot delete system categories

      if (error) {
        handleSupabaseError(error);
      }
    } catch (error) {
      throw handleError(error, {
        context: 'GoalCategoryAdapter.softDelete',
        id,
      });
    }
  }

  /**
   * Check if a category is in use by any goals
   */
  async isInUse(id: string): Promise<boolean> {
    try {
      const tenantId = await this.ensureTenantContext();
      const supabase = await this.getSupabaseClient();

      const { count, error } = await supabase
        .from('goals')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', id)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);

      if (error) {
        handleSupabaseError(error);
      }

      return (count || 0) > 0;
    } catch (error) {
      throw handleError(error, {
        context: 'GoalCategoryAdapter.isInUse',
        id,
      });
    }
  }

  /**
   * Seed default categories for a tenant
   */
  async seedDefaults(): Promise<void> {
    try {
      const tenantId = await this.ensureTenantContext();
      const supabase = await this.getSupabaseClient();

      // Call the database function to seed defaults
      const { error } = await supabase.rpc('seed_default_goal_categories', {
        p_tenant_id: tenantId,
      });

      if (error) {
        handleSupabaseError(error);
      }
    } catch (error) {
      throw handleError(error, {
        context: 'GoalCategoryAdapter.seedDefaults',
      });
    }
  }
}
