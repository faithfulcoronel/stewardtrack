import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseServiceClient } from '@/lib/supabase/service';
import type { IScheduleAttendanceService } from '@/services/ScheduleAttendanceService';
import type { ISchedulerService } from '@/services/SchedulerService';
import type { IScheduleOccurrenceRepository } from '@/repositories/scheduleOccurrence.repository';
import type { EncryptionService } from '@/lib/encryption/EncryptionService';
import { getFieldEncryptionConfig } from '@/utils/encryptionUtils';
import { decodeAttendanceToken, isAttendanceTokenValid } from '@/lib/tokens/attendanceToken';

interface AttendanceRequest {
  token: string;
}

/**
 * POST /api/attend
 * Record attendance for an authenticated user using the attendance token
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: AttendanceRequest = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    // Decode and validate token
    const tokenData = decodeAttendanceToken(token);
    if (!tokenData) {
      return NextResponse.json(
        { success: false, error: 'Invalid attendance token' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (!isAttendanceTokenValid(token)) {
      return NextResponse.json(
        { success: false, error: 'Attendance token has expired' },
        { status: 400 }
      );
    }

    const { tenantId, scheduleId } = tokenData;

    // Check authentication
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // Use service client for data queries (bypasses RLS)
    const serviceClient = await getSupabaseServiceClient();

    // Get the user's member record
    // The members table has user_id column that links directly to auth.users
    let memberRecord = null;

    // Query members directly by user_id and tenant_id
    const { data: memberByUserId, error: memberError } = await serviceClient
      .from('members')
      .select('id, first_name, last_name, email, encrypted_fields')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (memberError && memberError.code !== 'PGRST116') {
      console.error('Error querying member by user_id:', memberError);
    }

    if (memberByUserId) {
      // Decrypt member fields if encrypted
      const encryptionService = container.get<EncryptionService>(TYPES.EncryptionService);
      const encryptedFields = memberByUserId.encrypted_fields as string[] | undefined;
      const firstName = memberByUserId.first_name as string | undefined;
      const looksEncrypted = firstName && typeof firstName === 'string' &&
        firstName.match(/^\d+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/);

      if (looksEncrypted || (encryptedFields && encryptedFields.length > 0)) {
        memberRecord = await encryptionService.decryptFields(
          memberByUserId as Record<string, unknown>,
          tenantId,
          getFieldEncryptionConfig('members')
        );
      } else {
        memberRecord = memberByUserId;
      }
    }

    if (!memberRecord) {
      // Get tenant name for better error message
      const { data: tenant } = await serviceClient
        .from('tenants')
        .select('name')
        .eq('id', tenantId)
        .single();

      // Debug: Log what we found for troubleshooting
      console.log('Attendance lookup failed:', {
        userId: user.id,
        userEmail: user.email,
        tenantId,
      });

      return NextResponse.json(
        {
          success: false,
          error: `Your user account is not linked to a member record in ${tenant?.name || 'this organization'}. Please ask your administrator to link your account.`,
          code: 'MEMBER_NOT_LINKED',
        },
        { status: 403 }
      );
    }

    // Get the schedule to verify it exists
    const schedulerService = container.get<ISchedulerService>(TYPES.SchedulerService);
    const schedule = await schedulerService.getById(scheduleId, tenantId);

    if (!schedule) {
      return NextResponse.json(
        { success: false, error: 'Schedule not found' },
        { status: 404 }
      );
    }

    // Find the current or next occurrence for this schedule (within a reasonable window)
    const occurrenceRepository = container.get<IScheduleOccurrenceRepository>(TYPES.IScheduleOccurrenceRepository);

    // Get today's date and the day before/after to account for timezone differences
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 1);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 1);

    const occurrences = await occurrenceRepository.getByFilters(
      {
        scheduleId,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        statuses: ['scheduled', 'in_progress'],
      },
      tenantId
    );

    if (occurrences.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No active event found for today. Please check the schedule.' },
        { status: 404 }
      );
    }

    // Use the closest occurrence to now
    const now = new Date();
    const targetOccurrence = occurrences.reduce((closest, current) => {
      const closestDiff = Math.abs(new Date(closest.start_at).getTime() - now.getTime());
      const currentDiff = Math.abs(new Date(current.start_at).getTime() - now.getTime());
      return currentDiff < closestDiff ? current : closest;
    });

    // Record attendance
    const attendanceService = container.get<IScheduleAttendanceService>(TYPES.ScheduleAttendanceService);

    // Check if already checked in
    const isCheckedIn = await attendanceService.isAlreadyCheckedIn(
      targetOccurrence.id,
      memberRecord.id,
      tenantId
    );

    if (isCheckedIn) {
      return NextResponse.json({
        success: true,
        alreadyCheckedIn: true,
        data: {
          message: 'You have already checked in for this event',
          memberName: `${memberRecord.first_name} ${memberRecord.last_name}`,
          scheduleName: schedule.name,
          eventDate: targetOccurrence.occurrence_date,
        },
      });
    }

    // Record the check-in
    const attendance = await attendanceService.checkInMember(
      targetOccurrence.id,
      memberRecord.id,
      'self_checkin',
      user.id,
      tenantId
    );

    return NextResponse.json({
      success: true,
      alreadyCheckedIn: false,
      data: {
        attendanceId: attendance.id,
        message: 'Attendance recorded successfully',
        memberName: `${memberRecord.first_name} ${memberRecord.last_name}`,
        scheduleName: schedule.name,
        eventDate: targetOccurrence.occurrence_date,
        checkedInAt: attendance.checked_in_at,
      },
    });
  } catch (error) {
    console.error('Error recording attendance:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to record attendance' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/attend?token=...
 * Validate token and get schedule info
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    // Decode and validate token
    const tokenData = decodeAttendanceToken(token);
    if (!tokenData) {
      return NextResponse.json(
        { success: false, error: 'Invalid attendance token' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (!isAttendanceTokenValid(token)) {
      return NextResponse.json(
        { success: false, error: 'Attendance token has expired' },
        { status: 400 }
      );
    }

    const { tenantId, scheduleId, expiresAt } = tokenData;

    // Get the schedule
    const schedulerService = container.get<ISchedulerService>(TYPES.SchedulerService);
    const schedule = await schedulerService.getById(scheduleId, tenantId);

    if (!schedule) {
      return NextResponse.json(
        { success: false, error: 'Schedule not found' },
        { status: 404 }
      );
    }

    // Get tenant info
    const supabase = await createSupabaseServerClient();
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .single();

    return NextResponse.json({
      success: true,
      data: {
        scheduleName: schedule.name,
        scheduleDescription: schedule.description,
        ministryName: schedule.ministry.name,
        tenantName: tenant?.name || 'Organization',
        expiresAt: new Date(expiresAt).toISOString(),
      },
    });
  } catch (error) {
    console.error('Error validating attendance token:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to validate token' },
      { status: 500 }
    );
  }
}
