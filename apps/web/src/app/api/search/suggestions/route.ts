/**
 * Search Suggestions API Route
 * Autocomplete and AI-powered suggestions
 */

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { getCurrentTenantId } from '@/lib/server/context';
import type { SearchService } from '@/services/SearchService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/search/suggestions?q=partial
 * Get autocomplete suggestions
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = await getCurrentTenantId();

    const searchParams = request.nextUrl.searchParams;
    const partialQuery = searchParams.get('q') || '';

    if (!partialQuery || partialQuery.trim().length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const searchService = container.get<SearchService>(TYPES.SearchService);
    const suggestions = await searchService.getAutocompleteSuggestions(
      tenantId,
      partialQuery.trim()
    );

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('[Search Suggestions API] Error:', error);
    return NextResponse.json({ suggestions: [] }, { status: 500 });
  }
}

/**
 * POST /api/search/suggestions
 * Get AI-powered smart suggestions
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = await getCurrentTenantId();

    const body = await request.json();
    const { query, context } = body;

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const searchService = container.get<SearchService>(TYPES.SearchService);
    const suggestions = await searchService.getSmartSuggestions(
      tenantId,
      query.trim(),
      context
    );

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('[Search Suggestions API] Error:', error);
    return NextResponse.json({ suggestions: [] }, { status: 500 });
  }
}
