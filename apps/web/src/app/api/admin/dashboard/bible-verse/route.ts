import { NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AuthorizationService } from '@/services/AuthorizationService';
import type { AdminDashboardService } from '@/services/AdminDashboardService';

/**
 * GET /api/admin/dashboard/bible-verse
 *
 * Fetches a new random Bible verse from the API.
 * Used for refreshing the verse without reloading the entire dashboard.
 */
export async function GET() {
  try {
    // Check authentication
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get dashboard service
    const dashboardService = container.get<AdminDashboardService>(TYPES.AdminDashboardService);

    // Fetch only the bible verse
    const bibleVerse = await dashboardService.getBibleVerse();

    return NextResponse.json({
      success: true,
      data: bibleVerse,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Bible Verse API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch bible verse',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
