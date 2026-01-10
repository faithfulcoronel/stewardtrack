import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AuthorizationService } from '@/services/AuthorizationService';
import type { IScheduleOccurrenceService } from '@/services/ScheduleOccurrenceService';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/community/scheduler/occurrences/[id]/qr-token
 * Generate a QR token for check-in
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

    const expiresInHours = body.expires_in_hours || 24;

    const result = await occurrenceService.generateQrToken(id, expiresInHours);

    return NextResponse.json({
      success: true,
      data: {
        token: result.token,
        expiresAt: result.expiresAt,
        expiresInHours,
      },
    });
  } catch (error) {
    console.error('Error generating QR token:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate QR token' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/community/scheduler/occurrences/[id]/qr-token
 * Validate a QR token (public endpoint for self check-in)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ success: false, error: 'Token is required' }, { status: 400 });
    }

    const occurrenceService = container.get<IScheduleOccurrenceService>(TYPES.ScheduleOccurrenceService);

    const result = await occurrenceService.validateQrToken(token);

    if (!result.valid) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    const view = result.occurrence ? occurrenceService.toOccurrenceView(result.occurrence) : null;

    return NextResponse.json({
      success: true,
      data: {
        valid: true,
        occurrence: view,
      },
    });
  } catch (error) {
    console.error('Error validating QR token:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to validate QR token' },
      { status: 500 }
    );
  }
}
