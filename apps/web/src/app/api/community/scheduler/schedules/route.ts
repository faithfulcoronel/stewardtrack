import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AuthorizationService } from '@/services/AuthorizationService';
import type { ISchedulerService } from '@/services/SchedulerService';
import type { MinistryScheduleFilters, MinistryScheduleCreateInput } from '@/models/scheduler/ministrySchedule.model';

/**
 * GET /api/community/scheduler/schedules
 * Get all schedules with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const schedulerService = container.get<ISchedulerService>(TYPES.SchedulerService);

    const { searchParams } = new URL(request.url);

    // Build filters
    const filters: MinistryScheduleFilters = {};

    const ministryId = searchParams.get('ministry_id');
    if (ministryId) filters.ministryId = ministryId;

    const scheduleType = searchParams.get('schedule_type');
    if (scheduleType) filters.scheduleType = scheduleType as MinistryScheduleFilters['scheduleType'];

    const isActive = searchParams.get('is_active');
    if (isActive !== null) filters.isActive = isActive === 'true';

    const activeOnly = searchParams.get('active_only') === 'true';

    let data;
    if (activeOnly) {
      const schedules = await schedulerService.getActive();
      data = schedulerService.toScheduleViewList(schedules);
    } else if (Object.keys(filters).length > 0) {
      const schedules = await schedulerService.getByFilters(filters);
      data = schedulerService.toScheduleViewList(schedules);
    } else {
      const schedules = await schedulerService.getAll();
      data = schedulerService.toScheduleViewList(schedules);
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch schedules' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/community/scheduler/schedules
 * Create a new schedule
 */
export async function POST(request: NextRequest) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const schedulerService = container.get<ISchedulerService>(TYPES.SchedulerService);
    const body: MinistryScheduleCreateInput = await request.json();

    // Basic validation
    if (!body.ministry_id || !body.name || !body.start_time || !body.recurrence_start_date) {
      return NextResponse.json(
        { success: false, error: 'Ministry ID, name, start time, and recurrence start date are required' },
        { status: 400 }
      );
    }

    const schedule = await schedulerService.createSchedule(body, undefined, authResult.user?.id);

    return NextResponse.json({ success: true, data: schedule }, { status: 201 });
  } catch (error) {
    console.error('Error creating schedule:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create schedule' },
      { status: 500 }
    );
  }
}
