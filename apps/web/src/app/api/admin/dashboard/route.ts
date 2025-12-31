import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AuthorizationService } from '@/services/AuthorizationService';
import type { AdminDashboardService } from '@/services/AdminDashboardService';

/**
 * GET /api/admin/dashboard
 *
 * Fetches the complete admin dashboard data including:
 * - Welcome message with tenant and user info
 * - Bible verse of the day
 * - Summary metrics (members, finances, events, engagement)
 * - Quick links
 * - Highlights/attention items
 * - Recent activity
 * - Upcoming events
 * - Upcoming birthdays
 */
export async function GET(request: NextRequest) {
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

    const user = authResult.user;
    const lastSignIn = user.last_sign_in_at || null;

    // Get dashboard service
    const dashboardService = container.get<AdminDashboardService>(TYPES.AdminDashboardService);

    // Parse optional query params for configuration
    const { searchParams } = new URL(request.url);
    const maxHighlights = parseInt(searchParams.get('maxHighlights') || '5', 10);
    const maxActivity = parseInt(searchParams.get('maxActivity') || '10', 10);
    const maxEvents = parseInt(searchParams.get('maxEvents') || '5', 10);
    const maxBirthdays = parseInt(searchParams.get('maxBirthdays') || '7', 10);
    const enableBibleVerse = searchParams.get('enableBibleVerse') !== 'false';

    // Fetch dashboard data
    const data = await dashboardService.getDashboardData(
      user.id,
      user.email || '',
      lastSignIn,
      {
        maxHighlights,
        maxRecentActivity: maxActivity,
        maxUpcomingEvents: maxEvents,
        maxBirthdays,
        enableBibleVerse,
      }
    );

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Dashboard API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
