import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AuthorizationService } from '@/services/AuthorizationService';
import type { ISchedulerService } from '@/services/SchedulerService';
import type { IScheduleOccurrenceService } from '@/services/ScheduleOccurrenceService';

/**
 * GET /api/community/scheduler
 * Get scheduler dashboard data (upcoming events, stats)
 */
export async function GET(request: NextRequest) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const schedulerService = container.get<ISchedulerService>(TYPES.SchedulerService);
    const occurrenceService = container.get<IScheduleOccurrenceService>(TYPES.ScheduleOccurrenceService);

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7', 10);

    // Get upcoming occurrences
    const upcomingOccurrences = await occurrenceService.getUpcoming(days);
    const upcomingViews = occurrenceService.toOccurrenceViewList(upcomingOccurrences);

    // Get active schedules count
    const activeSchedules = await schedulerService.getActive();

    return NextResponse.json({
      success: true,
      data: {
        upcomingEvents: upcomingViews,
        activeSchedulesCount: activeSchedules.length,
        upcomingDays: days,
      },
    });
  } catch (error) {
    console.error('Error fetching scheduler dashboard:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch scheduler dashboard' },
      { status: 500 }
    );
  }
}
