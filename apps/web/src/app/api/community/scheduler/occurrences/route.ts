import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AuthorizationService } from '@/services/AuthorizationService';
import type { IScheduleOccurrenceService } from '@/services/ScheduleOccurrenceService';
import type { ScheduleOccurrenceFilters } from '@/models/scheduler/scheduleOccurrence.model';

/**
 * GET /api/community/scheduler/occurrences
 * Get occurrences with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const occurrenceService = container.get<IScheduleOccurrenceService>(TYPES.ScheduleOccurrenceService);

    const { searchParams } = new URL(request.url);

    // Build filters
    const filters: ScheduleOccurrenceFilters = {};

    const scheduleId = searchParams.get('schedule_id');
    if (scheduleId) filters.scheduleId = scheduleId;

    const ministryId = searchParams.get('ministry_id');
    if (ministryId) filters.ministryId = ministryId;

    const startDate = searchParams.get('start_date');
    if (startDate) filters.startDate = startDate;

    const endDate = searchParams.get('end_date');
    if (endDate) filters.endDate = endDate;

    const status = searchParams.get('status');
    if (status) filters.status = status as ScheduleOccurrenceFilters['status'];

    const statuses = searchParams.get('statuses');
    if (statuses) filters.statuses = statuses.split(',') as ScheduleOccurrenceFilters['statuses'];

    // Check for upcoming shortcut
    const upcoming = searchParams.get('upcoming');
    if (upcoming) {
      const days = parseInt(upcoming, 10) || 7;
      const occurrences = await occurrenceService.getUpcoming(days);
      const views = occurrenceService.toOccurrenceViewList(occurrences);
      return NextResponse.json({ success: true, data: views });
    }

    // Check for date range
    if (startDate && endDate) {
      const occurrences = await occurrenceService.getByDateRange(startDate, endDate);
      const views = occurrenceService.toOccurrenceViewList(occurrences);
      return NextResponse.json({ success: true, data: views });
    }

    // Filter-based query
    const occurrences = await occurrenceService.getByFilters(filters);
    const views = occurrenceService.toOccurrenceViewList(occurrences);

    return NextResponse.json({ success: true, data: views });
  } catch (error) {
    console.error('Error fetching occurrences:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch occurrences' },
      { status: 500 }
    );
  }
}
