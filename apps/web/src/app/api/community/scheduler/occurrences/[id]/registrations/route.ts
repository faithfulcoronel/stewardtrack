import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AuthorizationService } from '@/services/AuthorizationService';
import type { IScheduleRegistrationService } from '@/services/ScheduleRegistrationService';
import type { ScheduleRegistrationFilters, GuestRegistrationInput } from '@/models/scheduler/scheduleRegistration.model';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/community/scheduler/occurrences/[id]/registrations
 * Get registrations for an occurrence
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const registrationService = container.get<IScheduleRegistrationService>(TYPES.ScheduleRegistrationService);

    const { searchParams } = new URL(request.url);

    // Build filters
    const filters: ScheduleRegistrationFilters = { occurrenceId: id };

    const status = searchParams.get('status');
    if (status) filters.status = status as ScheduleRegistrationFilters['status'];

    const statuses = searchParams.get('statuses');
    if (statuses) filters.statuses = statuses.split(',') as ScheduleRegistrationFilters['statuses'];

    const waitlistOnly = searchParams.get('waitlist_only') === 'true';

    let registrations;
    if (waitlistOnly) {
      registrations = await registrationService.getWaitlist(id);
    } else {
      registrations = await registrationService.getByFilters(filters);
    }

    const views = registrationService.toRegistrationViewList(registrations);

    // Get counts
    const counts = await registrationService.getRegistrationCount(id);

    return NextResponse.json({
      success: true,
      data: views,
      counts,
    });
  } catch (error) {
    console.error('Error fetching registrations:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch registrations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/community/scheduler/occurrences/[id]/registrations
 * Register for an occurrence (member or guest)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const registrationService = container.get<IScheduleRegistrationService>(TYPES.ScheduleRegistrationService);
    const body = await request.json();

    let registration;

    if (body.member_id) {
      // Member registration
      registration = await registrationService.registerMember(
        id,
        body.member_id,
        {
          party_size: body.party_size,
          form_responses: body.form_responses,
          special_requests: body.special_requests,
        }
      );
    } else if (body.guest_name && body.guest_email) {
      // Guest registration
      const guestData: GuestRegistrationInput = {
        occurrence_id: id,
        guest_name: body.guest_name,
        guest_email: body.guest_email,
        guest_phone: body.guest_phone,
        party_size: body.party_size,
        form_responses: body.form_responses,
        special_requests: body.special_requests,
      };
      registration = await registrationService.registerGuest(guestData);
    } else {
      return NextResponse.json(
        { success: false, error: 'Either member_id or guest_name and guest_email are required' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: registration }, { status: 201 });
  } catch (error) {
    console.error('Error creating registration:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create registration' },
      { status: 500 }
    );
  }
}
