/**
 * Global Search API Route
 * Unified search endpoint for all entity types
 */

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';
import type { SearchService } from '@/services/SearchService';
import type { SearchEntityType, SearchQuery } from '@/models/search.model';

export const dynamic = 'force-dynamic';

/**
 * GET /api/search?q=query&types=member,event&limit=10
 * Search across all entity types
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = await getCurrentTenantId();
    const userId = await getCurrentUserId();

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const typesParam = searchParams.get('types');
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const useAI = searchParams.get('ai') === 'true';

    // Validate query
    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        query: '',
        groups: [],
        totalCount: 0,
        duration: 0,
      });
    }

    // Parse entity types
    const entityTypes: SearchEntityType[] | undefined = typesParam
      ? (typesParam.split(',').filter(Boolean) as SearchEntityType[])
      : undefined;

    // Build search query
    const searchQuery: SearchQuery = {
      query: query.trim(),
      entityTypes,
      limit: Math.min(limit, 50), // Cap at 50
      offset: Math.max(offset, 0),
      useAI,
    };

    // Execute search
    const searchService = container.get<SearchService>(TYPES.SearchService);
    const results = await searchService.search(tenantId, userId, searchQuery);

    return NextResponse.json(results);
  } catch (error) {
    console.error('[Search API] Error:', error);
    return NextResponse.json(
      { error: 'Search failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/search
 * Search with advanced options (body-based)
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = await getCurrentTenantId();
    const userId = await getCurrentUserId();

    const body = await request.json();
    const { query, entityTypes, limit = 10, offset = 0, useAI = false, dateRange } = body;

    // Validate query
    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        query: '',
        groups: [],
        totalCount: 0,
        duration: 0,
      });
    }

    // Build search query
    const searchQuery: SearchQuery = {
      query: query.trim(),
      entityTypes,
      limit: Math.min(limit, 50),
      offset: Math.max(offset, 0),
      useAI,
      dateRange,
    };

    // Execute search
    const searchService = container.get<SearchService>(TYPES.SearchService);
    const results = await searchService.search(tenantId, userId, searchQuery);

    return NextResponse.json(results);
  } catch (error) {
    console.error('[Search API] Error:', error);
    return NextResponse.json(
      { error: 'Search failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
