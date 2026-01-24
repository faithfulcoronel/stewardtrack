import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AuthorizationService } from '@/services/AuthorizationService';
import type { ISchedulerService } from '@/services/SchedulerService';
import { encodeAttendanceToken } from '@/lib/tokens/attendanceToken';
import { getCurrentTenantId } from '@/lib/server/context';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/community/scheduler/schedules/[id]/attendance-qr
 * Get or generate the attendance QR token for a schedule
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: scheduleId } = await params;
    const tenantId = await getCurrentTenantId();
    const schedulerService = container.get<ISchedulerService>(TYPES.SchedulerService);

    // Verify schedule exists
    const schedule = await schedulerService.getById(scheduleId);
    if (!schedule) {
      return NextResponse.json({ success: false, error: 'Schedule not found' }, { status: 404 });
    }

    // Generate a token valid for 24 hours by default (can be regenerated)
    const expirationHours = 24;
    const expirationDays = expirationHours / 24;
    const token = encodeAttendanceToken(tenantId, scheduleId, expirationDays);

    // Calculate expiration date
    const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000).toISOString();

    // Build the full attendance URL
    const baseUrl = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const attendanceUrl = `${baseUrl}/attend/${token}`;

    return NextResponse.json({
      success: true,
      data: {
        token,
        attendanceUrl,
        expiresAt,
        expiresInHours: expirationHours,
      },
    });
  } catch (error) {
    console.error('Error generating attendance QR token:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate QR token' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/community/scheduler/schedules/[id]/attendance-qr
 * Generate a new attendance QR token with custom expiration
 * Supports: expires_in_hours (number) or expires_at (ISO string)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: scheduleId } = await params;
    const tenantId = await getCurrentTenantId();
    const schedulerService = container.get<ISchedulerService>(TYPES.SchedulerService);

    // Verify schedule exists
    const schedule = await schedulerService.getById(scheduleId);
    if (!schedule) {
      return NextResponse.json({ success: false, error: 'Schedule not found' }, { status: 404 });
    }

    // Parse expiration from request body
    const body = await request.json().catch(() => ({}));

    let expiresAt: Date;
    let expirationHours: number;

    if (body.expires_at) {
      // Custom datetime provided
      expiresAt = new Date(body.expires_at);
      if (isNaN(expiresAt.getTime())) {
        return NextResponse.json(
          { success: false, error: 'Invalid expiration date format' },
          { status: 400 }
        );
      }
      if (expiresAt <= new Date()) {
        return NextResponse.json(
          { success: false, error: 'Expiration must be in the future' },
          { status: 400 }
        );
      }
      // Calculate hours for response
      expirationHours = Math.ceil((expiresAt.getTime() - Date.now()) / (60 * 60 * 1000));
    } else {
      // Hours provided
      expirationHours = body.expires_in_hours || 24;

      // Validate expiration range (1 hour to 168 hours / 7 days)
      if (expirationHours < 1 || expirationHours > 168) {
        return NextResponse.json(
          { success: false, error: 'Expiration must be between 1 and 168 hours (7 days)' },
          { status: 400 }
        );
      }

      expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
    }

    // Convert to fractional days for the token encoder
    const expirationDays = (expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    const token = encodeAttendanceToken(tenantId, scheduleId, expirationDays);

    // Build the full attendance URL
    const baseUrl = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const attendanceUrl = `${baseUrl}/attend/${token}`;

    return NextResponse.json({
      success: true,
      data: {
        token,
        attendanceUrl,
        expiresAt: expiresAt.toISOString(),
        expiresInHours: expirationHours,
      },
    });
  } catch (error) {
    console.error('Error generating attendance QR token:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate QR token' },
      { status: 500 }
    );
  }
}
