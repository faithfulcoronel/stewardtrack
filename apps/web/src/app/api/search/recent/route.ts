/**
 * Recent Searches API Route
 * Manage search history and suggestions
 */

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';
import type { SearchService } from '@/services/SearchService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/search/recent
 * Get recent searches for the current user
 */
export async function GET() {
  try {
    const tenantId = await getCurrentTenantId();
    const userId = await getCurrentUserId();

    const searchService = container.get<SearchService>(TYPES.SearchService);
    const recentSearches = await searchService.getRecentSearches(tenantId, userId);

    return NextResponse.json({ recentSearches });
  } catch (error) {
    console.error('[Recent Searches API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get recent searches', recentSearches: [] },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/search/recent
 * Clear recent search history
 */
export async function DELETE() {
  try {
    const tenantId = await getCurrentTenantId();
    const userId = await getCurrentUserId();

    const searchService = container.get<SearchService>(TYPES.SearchService);
    await searchService.clearRecentSearches(tenantId, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Recent Searches API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to clear recent searches' },
      { status: 500 }
    );
  }
}
