/**
 * Global Search Adapter
 * Data access layer for unified search across all entities
 * Uses PostgreSQL RPC for optimized full-text search
 */

import { injectable } from 'inversify';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type {
  SearchEntityType,
  SearchQuery,
  SearchResponse,
  SearchResultGroup,
  SearchResultItem,
  RecentSearch,
} from '@/models/search.model';

// =====================================================
// Interface
// =====================================================

export interface ISearchAdapter {
  /**
   * Execute global search across all entity types
   */
  search(tenantId: string, query: SearchQuery): Promise<SearchResponse>;

  /**
   * Get recent searches for a user
   */
  getRecentSearches(tenantId: string, userId: string, limit?: number): Promise<RecentSearch[]>;

  /**
   * Save a search to recent history
   */
  saveRecentSearch(
    tenantId: string,
    userId: string,
    query: string,
    entityTypes: SearchEntityType[],
    resultCount: number
  ): Promise<void>;

  /**
   * Clear recent search history
   */
  clearRecentSearches(tenantId: string, userId: string): Promise<void>;

  /**
   * Get search suggestions based on partial query
   */
  getSearchSuggestions(tenantId: string, partialQuery: string): Promise<string[]>;
}

// =====================================================
// RPC Response Types
// =====================================================

interface RpcSearchResultGroup {
  entityType: SearchEntityType;
  results: RpcSearchResultItem[];
  totalCount: number;
}

interface RpcSearchResultItem {
  id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  tags?: string[];
  timestamp?: string;
  score: number;
}

interface RpcSearchResponse {
  query: string;
  groups: RpcSearchResultGroup[];
  totalCount: number;
  duration: number;
}

// =====================================================
// Implementation
// =====================================================

@injectable()
export class SearchAdapter implements ISearchAdapter {
  /**
   * Execute global search using PostgreSQL RPC
   */
  async search(tenantId: string, query: SearchQuery): Promise<SearchResponse> {
    const supabase = await createSupabaseServerClient();
    const startTime = Date.now();

    // Validate and sanitize query
    const sanitizedQuery = this.sanitizeSearchQuery(query.query);
    if (!sanitizedQuery || sanitizedQuery.length < 2) {
      return this.createEmptyResponse(query.query, Date.now() - startTime);
    }

    try {
      // Call the global_search RPC function
      const { data, error } = await supabase.rpc('global_search', {
        p_tenant_id: tenantId,
        p_query: sanitizedQuery,
        p_entity_types: query.entityTypes || null,
        p_limit: query.limit || 10,
        p_offset: query.offset || 0,
      });

      if (error) {
        console.error('[SearchAdapter] RPC error:', error);
        throw new Error(`Search failed: ${error.message}`);
      }

      const rpcResponse = data as RpcSearchResponse;

      // Transform RPC response to SearchResponse
      return this.transformResponse(rpcResponse, Date.now() - startTime);
    } catch (error) {
      console.error('[SearchAdapter] Search error:', error);
      // Return empty results on error rather than throwing
      return this.createEmptyResponse(query.query, Date.now() - startTime);
    }
  }

  /**
   * Get recent searches for a user
   */
  async getRecentSearches(
    tenantId: string,
    userId: string,
    limit: number = 10
  ): Promise<RecentSearch[]> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('search_history')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      // Table might not exist yet, return empty array
      console.warn('[SearchAdapter] getRecentSearches error:', error.message);
      return [];
    }

    return (data || []).map((row: { id: string; query: string; entity_types: SearchEntityType[]; created_at: string; result_count: number }) => ({
      id: row.id,
      query: row.query,
      entityTypes: row.entity_types,
      timestamp: row.created_at,
      resultCount: row.result_count,
    }));
  }

  /**
   * Save a search to recent history
   */
  async saveRecentSearch(
    tenantId: string,
    userId: string,
    query: string,
    entityTypes: SearchEntityType[],
    resultCount: number
  ): Promise<void> {
    const supabase = await createSupabaseServerClient();

    // Upsert to avoid duplicates
    const { error } = await supabase.from('search_history').upsert(
      {
        tenant_id: tenantId,
        user_id: userId,
        query: query.toLowerCase().trim(),
        entity_types: entityTypes,
        result_count: resultCount,
        created_at: new Date().toISOString(),
      },
      {
        onConflict: 'tenant_id,user_id,query',
      }
    );

    if (error) {
      // Non-critical, just log
      console.warn('[SearchAdapter] saveRecentSearch error:', error.message);
    }
  }

  /**
   * Clear recent search history
   */
  async clearRecentSearches(tenantId: string, userId: string): Promise<void> {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from('search_history')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('user_id', userId);

    if (error) {
      console.warn('[SearchAdapter] clearRecentSearches error:', error.message);
    }
  }

  /**
   * Get search suggestions based on partial query
   */
  async getSearchSuggestions(tenantId: string, partialQuery: string): Promise<string[]> {
    const supabase = await createSupabaseServerClient();
    const sanitized = this.sanitizeSearchQuery(partialQuery);

    if (!sanitized || sanitized.length < 2) {
      return [];
    }

    // Get popular recent searches matching the partial query
    const { data, error } = await supabase
      .from('search_history')
      .select('query')
      .eq('tenant_id', tenantId)
      .ilike('query', `${sanitized}%`)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.warn('[SearchAdapter] getSearchSuggestions error:', error.message);
      return [];
    }

    // Get unique suggestions
    const uniqueSuggestions = [...new Set((data || []).map((row: { query: string }) => row.query))];
    return uniqueSuggestions.slice(0, 5);
  }

  // =====================================================
  // Private Helper Methods
  // =====================================================

  /**
   * Sanitize search query to prevent SQL injection
   */
  private sanitizeSearchQuery(query: string): string {
    return query
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML
      .replace(/['"`;]/g, '') // Remove quotes and semicolons
      .slice(0, 100); // Limit length
  }

  /**
   * Transform RPC response to SearchResponse
   */
  private transformResponse(rpcResponse: RpcSearchResponse, duration: number): SearchResponse {
    const groups: SearchResultGroup[] = (rpcResponse.groups || [])
      .filter((g) => g && g.entityType && g.results)
      .map((group) => this.transformGroup(group));

    return {
      query: rpcResponse.query,
      groups: groups.filter((g) => g.results.length > 0),
      totalCount: rpcResponse.totalCount || 0,
      duration,
    };
  }

  /**
   * Transform a single result group
   */
  private transformGroup(group: RpcSearchResultGroup): SearchResultGroup {
    const config = this.getEntityConfig(group.entityType);

    return {
      entityType: group.entityType,
      label: config.label,
      icon: config.icon,
      color: config.color,
      results: (group.results || []).map((item) =>
        this.transformResultItem(item, group.entityType, config)
      ),
      totalCount: group.totalCount || 0,
      hasMore: (group.results || []).length < (group.totalCount || 0),
    };
  }

  /**
   * Transform a single result item
   */
  private transformResultItem(
    item: RpcSearchResultItem,
    entityType: SearchEntityType,
    config: { label: string; icon: string; color: string; baseRoute: string }
  ): SearchResultItem {
    return {
      id: item.id,
      title: item.title || 'Untitled',
      subtitle: item.subtitle,
      description: item.description,
      imageUrl: item.imageUrl,
      score: item.score || 0.5,
      tags: item.tags || [],
      timestamp: item.timestamp,
      meta: {
        entityType,
        typeLabel: config.label,
        icon: config.icon,
        color: config.color,
        href: this.buildEntityHref(entityType, item.id, config.baseRoute),
      },
    };
  }

  /**
   * Build href for entity
   */
  private buildEntityHref(entityType: SearchEntityType, id: string, baseRoute: string): string {
    switch (entityType) {
      case 'member':
        return `${baseRoute}/${id}`;
      case 'account':
        return `${baseRoute}/${id}`;
      case 'transaction':
        return `${baseRoute}?id=${id}`;
      case 'event':
        return `${baseRoute}?eventId=${id}`;
      case 'ministry':
        return `${baseRoute}/${id}`;
      case 'care_plan':
        return `${baseRoute}/${id}`;
      case 'discipleship_plan':
        return `${baseRoute}/${id}`;
      case 'notebook':
        return `${baseRoute}/${id}`;
      case 'note':
        return `${baseRoute}?pageId=${id}`;
      case 'donation':
        return `${baseRoute}/${id}`;
      case 'family':
        return `${baseRoute}/${id}`;
      default:
        return baseRoute;
    }
  }

  /**
   * Get entity configuration
   */
  private getEntityConfig(entityType: SearchEntityType): {
    label: string;
    icon: string;
    color: string;
    baseRoute: string;
  } {
    const configs: Record<
      SearchEntityType,
      { label: string; icon: string; color: string; baseRoute: string }
    > = {
      member: {
        label: 'Member',
        icon: 'Users',
        color: 'blue',
        baseRoute: '/admin/members',
      },
      account: {
        label: 'Account',
        icon: 'Building2',
        color: 'purple',
        baseRoute: '/admin/community/accounts',
      },
      transaction: {
        label: 'Transaction',
        icon: 'Receipt',
        color: 'green',
        baseRoute: '/admin/finance/transactions',
      },
      event: {
        label: 'Event',
        icon: 'Calendar',
        color: 'orange',
        baseRoute: '/admin/community/planning/calendar',
      },
      ministry: {
        label: 'Ministry',
        icon: 'Users2',
        color: 'indigo',
        baseRoute: '/admin/community/planning/scheduler/ministries',
      },
      care_plan: {
        label: 'Care Plan',
        icon: 'Heart',
        color: 'pink',
        baseRoute: '/admin/community/care-plans',
      },
      discipleship_plan: {
        label: 'Discipleship',
        icon: 'GraduationCap',
        color: 'cyan',
        baseRoute: '/admin/community/discipleship-plans',
      },
      notebook: {
        label: 'Notebook',
        icon: 'BookOpen',
        color: 'amber',
        baseRoute: '/admin/community/planning/notebooks',
      },
      note: {
        label: 'Note',
        icon: 'FileText',
        color: 'gray',
        baseRoute: '/admin/community/planning/notebooks',
      },
      donation: {
        label: 'Donation',
        icon: 'HandCoins',
        color: 'emerald',
        baseRoute: '/admin/finance/donations',
      },
      family: {
        label: 'Family',
        icon: 'Home',
        color: 'teal',
        baseRoute: '/admin/community/families',
      },
    };

    return configs[entityType] || configs.member;
  }

  /**
   * Create empty response for invalid queries
   */
  private createEmptyResponse(query: string, duration: number): SearchResponse {
    return {
      query,
      groups: [],
      totalCount: 0,
      duration,
    };
  }
}
