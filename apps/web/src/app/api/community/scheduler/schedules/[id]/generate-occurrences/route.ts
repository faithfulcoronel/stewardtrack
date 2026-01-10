import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AuthorizationService } from '@/services/AuthorizationService';
import type { ISchedulerService } from '@/services/SchedulerService';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/community/scheduler/schedules/[id]/generate-occurrences
 * Generate occurrences for a schedule within a date range
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const schedulerService = container.get<ISchedulerService>(TYPES.SchedulerService);
    const body = await request.json();

    // Validate required fields
    if (!body.start_date || !body.end_date) {
      return NextResponse.json(
        { success: false, error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    // Validate date range (max 1 year)
    const start = new Date(body.start_date);
    const end = new Date(body.end_date);
    const maxDays = 366;
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff > maxDays) {
      return NextResponse.json(
        { success: false, error: `Date range cannot exceed ${maxDays} days` },
        { status: 400 }
      );
    }

    if (daysDiff < 0) {
      return NextResponse.json(
        { success: false, error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    const result = await schedulerService.generateOccurrences(
      id,
      body.start_date,
      body.end_date
    );

    return NextResponse.json({
      success: true,
      data: {
        created: result.created,
        skipped: result.skipped,
        total: result.occurrences.length,
        message: `Created ${result.created} occurrence(s), skipped ${result.skipped} existing`,
      },
    });
  } catch (error) {
    console.error('Error generating occurrences:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate occurrences' },
      { status: 500 }
    );
  }
}
