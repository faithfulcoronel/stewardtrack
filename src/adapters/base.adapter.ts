import 'server-only';
import 'reflect-metadata';
import { injectable, inject, optional } from 'inversify';
import type { SupabaseClient } from '@supabase/supabase-js';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getUserDisplayNameMap } from '@/lib/server/userDisplayName';
import { TYPES } from '@/lib/types';
import { BaseModel } from '@/models/base.model';
import { FilterOperator } from '@/lib/repository/types';
import type { IBaseAdapter } from '@/lib/repository/adapter.interfaces';
import type { FilterCondition, QueryOptions } from '@/lib/repository/query';
import type { RequestContext } from '@/lib/server/context';
import { handleError, TenantContextError } from '@/utils/errorHandler';
import { handleSupabaseError } from '@/utils/supabaseErrorHandler';

@injectable()
export class BaseAdapter<T extends BaseModel> implements IBaseAdapter<T> {
  protected tableName: string = '';
  protected defaultSelect: string = '';
  protected defaultRelationships: QueryOptions['relationships'] = [];

  @inject(TYPES.RequestContext) @optional()
  protected context?: RequestContext;

  protected supabase: SupabaseClient | null = null;

  protected async getSupabaseClient(): Promise<SupabaseClient> {
    if (!this.supabase) {
      this.supabase = await createSupabaseServerClient();
    }
    return this.supabase;
  }

  protected async getUserId(): Promise<string | undefined> {
    if (this.context?.userId) return this.context.userId;
    const supabase = await this.getSupabaseClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id;
  }

  protected async isSuperAdmin(): Promise<boolean> {
    try {
      const supabase = await this.getSupabaseClient();
      const { data, error } = await supabase.rpc('get_user_admin_role');

      if (error) {
        console.error('[BaseAdapter] get_user_admin_role RPC error:', error);
        return false;
      }

      return (data as string | null) === 'super_admin';
    } catch (error) {
      console.error('[BaseAdapter] Error checking super admin status:', error);
      return false;
    }
  }

  protected async attachUserNames<U extends { created_by?: string | null; updated_by?: string | null }>(
    records: U[]
  ): Promise<U[]> {
    const userIds = Array.from(
      new Set(
        records
          .flatMap(r => [r.created_by, r.updated_by])
          .filter((id): id is string => !!id)
      )
    );

    if (!userIds.length) return records;
    const supabase = await this.getSupabaseClient();
    const map = await getUserDisplayNameMap(
      supabase,
      this.context?.tenantId ?? null,
      userIds
    );

    return records.map(r => ({
      ...r,
      created_by_name: r.created_by ? map[r.created_by] || r.created_by : undefined,
      updated_by_name: r.updated_by ? map[r.updated_by] || r.updated_by : undefined,
    })) as U[];
  }

  // Lifecycle hooks
  protected async onBeforeCreate(data: Partial<T>): Promise<Partial<T>> {
    return data;
  }

  protected async onAfterCreate(data: T): Promise<void> {
    void data;
    // Default implementation
  }

  protected async onBeforeUpdate(id: string, data: Partial<T>): Promise<Partial<T>> {
    void id;
    return data;
  }

  protected async onAfterUpdate(data: T): Promise<void> {
    void data;
    // Default implementation
  }

  protected async onBeforeDelete(id: string): Promise<void> {
    void id;
    // Default implementation
  }

  protected async onAfterDelete(id: string): Promise<void> {
    void id;
    // Default implementation
  }

  protected buildFilterQuery(
    query: any,
    key: string,
    filter: FilterCondition | FilterCondition[] | string
  ) {
    const applyFilter = (
      operator: FilterOperator | string,
      value: unknown,
      valueTo?: unknown
    ) => {
      if (value === null || value === undefined) {
        return query;
      }

      switch (operator) {
        case 'equals':
        case 'eq':
          return query.eq(key, value);
        case 'notEquals':
        case 'neq':
          return query.neq(key, value);
        case 'greaterThan':
        case 'gt':
          return query.gt(key, value);
        case 'greaterThanOrEqual':
        case 'gte':
          return query.gte(key, value);
        case 'lessThan':
        case 'lt':
          return query.lt(key, value);
        case 'lessThanOrEqual':
        case 'lte':
          return query.lte(key, value);
        case 'contains':
          return query.ilike(key, `%${value}%`);
        case 'notContains':
          return query.not(key, 'ilike', `%${value}%`);
        case 'startsWith':
          return query.ilike(key, `${value}%`);
        case 'endsWith':
          return query.ilike(key, `%${value}`);
        case 'isEmpty':
          return query.is(key, null);
        case 'isNotEmpty':
          return query.not(key, 'is', null);
        case 'isAnyOf':
          return query.in(key, Array.isArray(value) ? value : [value]);
        case 'between':
          if (value !== null && valueTo !== null) {
            return query.gte(key, value).lte(key, valueTo);
          }
          return query;
        default:
          return query;
      }
    };

    if (key === 'or') {
      if (Array.isArray(filter)) {
        return query.or(
          filter
            .map(f =>
              f.field
                ? `${f.field}.${f.operator}.${f.value}`
                : `${key}.${f.operator}.${f.value}`
            )
            .join(',')
        );
      } else if (typeof filter === 'string') {
        return query.or(filter);
      } else if ('field' in filter && filter.field) {
        return query.or(`${filter.field}.${filter.operator}.${filter.value}`);
      }
    }

    if (Array.isArray(filter)) {
      return query.or(filter.map(f => `${key}.${f.operator}.${f.value}`).join(','));
    }

    if (typeof filter === 'string') {
      return query.or(filter);
    }

    return applyFilter(filter.operator, filter.value, filter.valueTo);
  }

  protected buildRelationshipQuery(
    relationships: QueryOptions['relationships'] = []
  ): string {
    const buildNestedSelect = (
      relationship: NonNullable<QueryOptions['relationships']>[0]
    ): string => {
      const baseSelect = relationship.select?.join(',') || '*';
      const alias = relationship.alias ? `${relationship.alias}:` : '';

      if (!relationship.nestedRelationships?.length) {
        return `${alias}${relationship.table}!${relationship.foreignKey}(${baseSelect})`;
      }

      const nestedSelects = relationship.nestedRelationships.map(nested =>
        buildNestedSelect(
          typeof nested === 'string'
            ? { table: nested, foreignKey: 'id' }
            : nested
        )
      );

      return `${alias}${relationship.table}!${relationship.foreignKey}(${baseSelect},${nestedSelects.join(',')})`;
    };

    return relationships.map(buildNestedSelect).join(',');
  }

  protected async buildSecureQuery(
    options: QueryOptions = {}
  ): Promise<{ query: any }> {
    try {
      const tenantId = this.context?.tenantId;
      const isSuperAdmin = await this.isSuperAdmin();

      if (!tenantId && !isSuperAdmin) {
        console.log("TenantId is " + tenantId);
        console.log("IsSuperAdmin is " + isSuperAdmin);
        throw new TenantContextError('No tenant context found');
      }

      const relationships = options.relationships || this.defaultRelationships || [];
      const relationshipQuery = this.buildRelationshipQuery(relationships);
      
      const supabase = await this.getSupabaseClient();
      let query = supabase
        .from(this.tableName)
        .select(
          relationshipQuery
            ? `${options.select || this.defaultSelect || '*'}, ${relationshipQuery}`
            : (options.select || this.defaultSelect || '*'),
          { count: 'exact' }
        );

      if (!isSuperAdmin) {
        query = query.eq('tenant_id', tenantId);
      }

      query = query.is('deleted_at', null);

      if (options.filters) {
        Object.entries(options.filters).forEach(([key, filter]) => {
          if (filter !== undefined && filter !== null) {
            query = this.buildFilterQuery(query, key, filter);
          }
        });
      }

      if (options.order) {
        query = query.order(options.order.column, {
          ascending: options.order.ascending ?? true
        });
      }

      if (options.pagination) {
        const { page, pageSize } = options.pagination;
        const start = (page - 1) * pageSize;
        query = query.range(start, start + pageSize - 1);
      }

      return { query };
    } catch (error) {
      throw handleError(error, {
        context: 'buildSecureQuery',
        tableName: this.tableName,
        options
      });
    }
  }

  public async fetch(options: QueryOptions = {}): Promise<{ data: T[]; count: number | null }> {
    try {
      if (options.enabled === false) {
        return { data: [], count: null };
      }

      const { query } = await this.buildSecureQuery(options);
      const { data, error, count } = await query;

      if (error) {
        handleSupabaseError(error);
      }
      const enriched = await this.attachUserNames((data as any[]) || []);
      return { data: enriched as T[], count };
    } catch (error) {
      throw handleError(error, {
        context: 'fetch',
        tableName: this.tableName,
        options
      });
    }
  }

  public async fetchById(id: string, options: Omit<QueryOptions, 'pagination'> = {}): Promise<T | null> {
    try {
      const { query } = await this.buildSecureQuery(options);
      const { data, error } = await query.eq('id', id).single();

      if (error) {
        handleSupabaseError(error);
      }
      const [enriched] = await this.attachUserNames((data ? [data] : []) as any[]);
      return (enriched as T) ?? null;
    } catch (error) {
      throw handleError(error, {
        context: 'fetchById',
        tableName: this.tableName,
        id,
        options
      });
    }
  }

  public async create(
    data: Partial<T>,
    relations?: Record<string, string[]>,
    fieldsToRemove: string[] = []
  ): Promise<T> {
    try {
      const tenantId = this.context?.tenantId;
      const isSuperAdmin = await this.isSuperAdmin();

      if (!tenantId && !isSuperAdmin) {
        throw new TenantContextError('No tenant context found');
      }

      // Run pre-create hook
      let processedData = await this.onBeforeCreate(data);
      
      // Remove specified fields
      if (fieldsToRemove) {
        processedData = this.sanitizeData(processedData, fieldsToRemove);
      }

      // Create record
      const userId = await this.getUserId();
      const supabase = await this.getSupabaseClient();
      const { data: created, error: createError } = await supabase
        .from(this.tableName)
        .insert([
          {
            ...processedData,
            tenant_id: tenantId,
            created_by: userId,
            updated_by: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (createError) {
        handleSupabaseError(createError);
      }

      // Handle relations if provided
      if (relations) {
        await this.updateRelations(created.id, relations);
      }

      // Run post-create hook
      await this.onAfterCreate(created);

      return created;
    } catch (error) {
      throw handleError(error, {
        context: 'create',
        tableName: this.tableName,
        data
      });
    }
  }

  public async update(
    id: string,
    data: Partial<T>,
    relations?: Record<string, string[]>,
    fieldsToRemove: string[] = []
  ): Promise<T> {
    try {
      const tenantId = this.context?.tenantId;
      const isSuperAdmin = await this.isSuperAdmin();

      if (!tenantId && !isSuperAdmin) {
        throw new TenantContextError('No tenant context found');
      }

      // Run pre-update hook
      let processedData = await this.onBeforeUpdate(id, data);

      // Remove specified fields
      if (fieldsToRemove) {
        processedData = this.sanitizeData(processedData, fieldsToRemove);
      }

      // Update record
      const userId = await this.getUserId();
      const supabase = await this.getSupabaseClient();
      const { data: updated, error: updateError } = await supabase
        .from(this.tableName)
        .update({
          ...processedData,
          updated_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (updateError) {
        handleSupabaseError(updateError);
      }

      // Handle relations if provided
      if (relations) {
        await this.updateRelations(id, relations);
      }

      // Run post-update hook
      await this.onAfterUpdate(updated);

      return updated;
    } catch (error) {
      throw handleError(error, {
        context: 'update',
        tableName: this.tableName,
        id,
        data
      });
    }
  }

  public async delete(id: string): Promise<void> {
    try {
      const tenantId = this.context?.tenantId;
      const isSuperAdmin = await this.isSuperAdmin();

      if (!tenantId && !isSuperAdmin) {
        throw new TenantContextError('No tenant context found');
      }

      // Run pre-delete hook
      await this.onBeforeDelete(id);

      // Soft delete the record
      const userId = await this.getUserId();
      const supabase = await this.getSupabaseClient();
      const { error } = await supabase
        .from(this.tableName)
        .update({
          deleted_at: new Date().toISOString(),
          updated_by: userId
        })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) {
        handleSupabaseError(error);
      }

      // Run post-delete hook
      await this.onAfterDelete(id);
    } catch (error) {
      throw handleError(error, {
        context: 'delete',
        tableName: this.tableName,
        id
      });
    }
  }

  protected async updateRelations(
    id: string,
    relations: Record<string, string[]>
  ): Promise<void> {
    const tenantId = this.context?.tenantId;
    const userId = await this.getUserId();
    const supabase = await this.getSupabaseClient();

    for (const [relationKey, relationIds] of Object.entries(relations)) {
      if (!relationIds || !relationIds.length) continue;

      const relationConfig = await this.getRelationConfig(relationKey);
      if (!relationConfig) continue;

      try {
        if (relationConfig.type === 'many-to-many' && relationConfig.joinTable) {
          await supabase
            .from(relationConfig.joinTable)
            .delete()
            .eq(relationConfig.foreignKey, id)
            .eq('tenant_id', tenantId);

            const relationData = relationIds.map(relationId => ({
              [relationConfig.foreignKey]: id,
              [relationConfig.joinForeignKey!]: relationId,
              tenant_id: tenantId,
              created_by: userId,
              created_at: new Date().toISOString()
            }));
          const { error } = await supabase
            .from(relationConfig.joinTable)
            .insert(relationData);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from(relationConfig.table)
            .update({ [relationConfig.foreignKey]: id })
            .in('id', relationIds)
            .eq('tenant_id', tenantId);

          if (error) throw error;
        }
      } catch (error) {
        throw handleError(error, {
          context: 'updateRelations',
          tableName: this.tableName,
          relationKey,
          id
        });
      }
    }
  }

  protected async getRelationConfig(
    relationKey: string
  ): Promise<{
    table: string;
    foreignKey: string;
    type: 'one-to-one' | 'one-to-many' | 'many-to-many';
    joinTable?: string;
    joinForeignKey?: string;
  } | null> {
    void relationKey;
    return null;
  }

  // Generalized sanitizeData method: Accept fields to remove dynamically
  private sanitizeData<D extends Record<string, unknown>>(
    data: D,
    fieldsToRemove: string[]
  ): D {
    const sanitizedData = { ...data } as Record<string, unknown>;

    fieldsToRemove.forEach((field) => {
      delete sanitizedData[field];
    });

    return sanitizedData as D;
  }

  /**
   * Fetch all records without applying a default limit.
   *
   * Pagination can still be provided via `options.pagination` when a limit is
   * desired.
   */
  public async fetchAll(
    options: Omit<QueryOptions, 'pagination'> = {}
  ): Promise<{ data: T[]; count: number | null }> {
    return this.fetch(options);
  }
}

export type { IBaseAdapter } from '@/lib/repository/adapter.interfaces';
export type { FilterCondition, QueryOptions } from '@/lib/repository/query';
