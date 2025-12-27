import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { PlanningService } from '@/services/PlanningService';
import type { AuthorizationService } from '@/services/AuthorizationService';

/**
 * GET /api/community/planning/calendar
 * Get calendar data for calendar view (events, categories, stats)
 */
export async function GET(request: NextRequest) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const planningService = container.get<PlanningService>(TYPES.PlanningService);

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      // Default to current month
      const now = new Date();
      const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const data = await planningService.getCalendarData(
        defaultStart.toISOString(),
        defaultEnd.toISOString()
      );
      return NextResponse.json(data);
    }

    const data = await planningService.getCalendarData(startDate, endDate);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching calendar data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar data' },
      { status: 500 }
    );
  }
}
