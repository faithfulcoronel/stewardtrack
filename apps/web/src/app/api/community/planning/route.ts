import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { PlanningService } from '@/services/PlanningService';
import type { AuthorizationService } from '@/services/AuthorizationService';
import { CalendarEventFilters } from '@/models/calendarEvent.model';

/**
 * GET /api/community/planning
 * Get calendar events with optional filters
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
    const categoryIds = searchParams.get('categoryIds')?.split(',').filter(Boolean);
    const eventTypes = searchParams.get('eventTypes')?.split(',').filter(Boolean);
    const memberId = searchParams.get('memberId');
    const assignedTo = searchParams.get('assignedTo');

    // If date range provided, get events for that range
    if (startDate && endDate) {
      const filters: CalendarEventFilters = {
        startDate,
        endDate,
        categoryIds: categoryIds?.length ? categoryIds : undefined,
        eventTypes: eventTypes?.length ? eventTypes as CalendarEventFilters['eventTypes'] : undefined,
        memberId: memberId || undefined,
        assignedTo: assignedTo || undefined,
      };

      const events = await planningService.getEventsByFilters(filters);
      return NextResponse.json({ events });
    }

    // Default: get upcoming events
    const events = await planningService.getUpcomingEvents(30);
    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar events' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/community/planning
 * Create a new calendar event
 */
export async function POST(request: NextRequest) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const planningService = container.get<PlanningService>(TYPES.PlanningService);
    const body = await request.json();

    const event = await planningService.createEvent(body);
    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json(
      { error: 'Failed to create calendar event' },
      { status: 500 }
    );
  }
}
