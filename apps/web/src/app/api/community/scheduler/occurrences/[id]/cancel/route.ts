import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AuthorizationService } from '@/services/AuthorizationService';
import type { IScheduleOccurrenceService } from '@/services/ScheduleOccurrenceService';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/community/scheduler/occurrences/[id]/cancel
 * Cancel an occurrence
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const occurrenceService = container.get<IScheduleOccurrenceService>(TYPES.ScheduleOccurrenceService);
    const body = await request.json();

    const reason = body.reason || 'No reason provided';

    const occurrence = await occurrenceService.cancelOccurrence(id, reason);

    return NextResponse.json({
      success: true,
      data: occurrence,
      message: 'Occurrence cancelled successfully',
    });
  } catch (error) {
    console.error('Error cancelling occurrence:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to cancel occurrence' },
      { status: 500 }
    );
  }
}
