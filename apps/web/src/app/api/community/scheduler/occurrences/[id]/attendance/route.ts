import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AuthorizationService } from '@/services/AuthorizationService';
import type { IScheduleAttendanceService } from '@/services/ScheduleAttendanceService';
import type { ScheduleAttendanceFilters, CheckinMethod } from '@/models/scheduler/scheduleAttendance.model';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/community/scheduler/occurrences/[id]/attendance
 * Get attendance records for an occurrence
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const attendanceService = container.get<IScheduleAttendanceService>(TYPES.ScheduleAttendanceService);

    const { searchParams } = new URL(request.url);

    // Check for stats request
    const includeStats = searchParams.get('include_stats') === 'true';

    if (includeStats) {
      const stats = await attendanceService.getAttendanceStats(id);
      return NextResponse.json({ success: true, data: stats });
    }

    // Build filters
    const filters: ScheduleAttendanceFilters = { occurrenceId: id };

    const checkinMethod = searchParams.get('checkin_method');
    if (checkinMethod) filters.checkinMethod = checkinMethod as ScheduleAttendanceFilters['checkinMethod'];

    const attendances = await attendanceService.getByFilters(filters);
    const views = attendanceService.toAttendanceViewList(attendances);

    return NextResponse.json({ success: true, data: views });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch attendance' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/community/scheduler/occurrences/[id]/attendance
 * Check in an attendee (member, guest, or via registration)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const attendanceService = container.get<IScheduleAttendanceService>(TYPES.ScheduleAttendanceService);
    const body = await request.json();

    const method: CheckinMethod = body.checkin_method || 'manual';
    const userId = authResult.user?.id;

    let attendance;

    if (body.registration_id) {
      // Check in via registration
      attendance = await attendanceService.checkInByRegistration(
        body.registration_id,
        method,
        userId
      );
    } else if (body.member_id) {
      // Member check-in
      attendance = await attendanceService.checkInMember(
        id,
        body.member_id,
        method,
        userId
      );
    } else if (body.guest_name) {
      // Guest check-in
      attendance = await attendanceService.checkInGuest(
        id,
        body.guest_name,
        method,
        userId
      );
    } else if (body.qr_token) {
      // QR code check-in
      attendance = await attendanceService.checkInByQrCode(
        body.qr_token,
        body.member_id,
        body.guest_name
      );
    } else {
      return NextResponse.json(
        { success: false, error: 'Either registration_id, member_id, guest_name, or qr_token is required' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: attendance }, { status: 201 });
  } catch (error) {
    console.error('Error checking in:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to check in' },
      { status: 500 }
    );
  }
}
