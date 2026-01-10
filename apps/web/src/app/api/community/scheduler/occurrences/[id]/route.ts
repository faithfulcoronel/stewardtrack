import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AuthorizationService } from '@/services/AuthorizationService';
import type { IScheduleOccurrenceService } from '@/services/ScheduleOccurrenceService';
import type { ScheduleOccurrenceUpdateInput } from '@/models/scheduler/scheduleOccurrence.model';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/community/scheduler/occurrences/[id]
 * Get an occurrence by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const occurrenceService = container.get<IScheduleOccurrenceService>(TYPES.ScheduleOccurrenceService);

    const occurrence = await occurrenceService.getById(id);

    if (!occurrence) {
      return NextResponse.json({ success: false, error: 'Occurrence not found' }, { status: 404 });
    }

    const view = occurrenceService.toOccurrenceView(occurrence);

    return NextResponse.json({ success: true, data: view });
  } catch (error) {
    console.error('Error fetching occurrence:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch occurrence' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/community/scheduler/occurrences/[id]
 * Update an occurrence
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const occurrenceService = container.get<IScheduleOccurrenceService>(TYPES.ScheduleOccurrenceService);
    const body: ScheduleOccurrenceUpdateInput = await request.json();

    const occurrence = await occurrenceService.updateOccurrence(id, body);

    return NextResponse.json({ success: true, data: occurrence });
  } catch (error) {
    console.error('Error updating occurrence:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update occurrence' },
      { status: 500 }
    );
  }
}
