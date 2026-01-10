import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { IScheduleOccurrenceService } from '@/services/ScheduleOccurrenceService';

/**
 * POST /api/community/scheduler/calendar-sync
 * Sync all schedule occurrences to the planning calendar
 * Also creates reminders for upcoming events
 */
export async function POST(_request: NextRequest) {
  try {
    const occurrenceService = container.get<IScheduleOccurrenceService>(TYPES.IScheduleOccurrenceService);

    // Sync all occurrences to calendar
    const syncedCount = await occurrenceService.syncAllToCalendar();

    return NextResponse.json({
      success: true,
      data: {
        syncedCount,
        message: `Successfully synced ${syncedCount} occurrences to the planning calendar`,
      },
    });
  } catch (error) {
    console.error('[calendar-sync] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync calendar',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/community/scheduler/calendar-sync
 * Get calendar sync status (for UI feedback)
 */
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: {
        lastSync: null, // TODO: Track last sync time in a system setting
        status: 'ready',
        message: 'Calendar sync is available',
      },
    });
  } catch (error) {
    console.error('[calendar-sync] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get sync status',
      },
      { status: 500 }
    );
  }
}
