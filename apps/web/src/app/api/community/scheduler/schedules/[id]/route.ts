import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AuthorizationService } from '@/services/AuthorizationService';
import type { ISchedulerService } from '@/services/SchedulerService';
import type { MinistryScheduleUpdateInput } from '@/models/scheduler/ministrySchedule.model';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/community/scheduler/schedules/[id]
 * Get a schedule by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const schedulerService = container.get<ISchedulerService>(TYPES.SchedulerService);

    const schedule = await schedulerService.getById(id);

    if (!schedule) {
      return NextResponse.json({ success: false, error: 'Schedule not found' }, { status: 404 });
    }

    const view = schedulerService.toScheduleView(schedule);

    return NextResponse.json({ success: true, data: view });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch schedule' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/community/scheduler/schedules/[id]
 * Update a schedule
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const schedulerService = container.get<ISchedulerService>(TYPES.SchedulerService);
    const body: MinistryScheduleUpdateInput = await request.json();

    const schedule = await schedulerService.updateSchedule(id, body, undefined, authResult.user?.id);

    return NextResponse.json({ success: true, data: schedule });
  } catch (error) {
    console.error('Error updating schedule:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update schedule' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/community/scheduler/schedules/[id]
 * Delete (soft delete) a schedule
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const schedulerService = container.get<ISchedulerService>(TYPES.SchedulerService);

    await schedulerService.deleteSchedule(id);

    return NextResponse.json({ success: true, message: 'Schedule deleted' });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete schedule' },
      { status: 500 }
    );
  }
}
