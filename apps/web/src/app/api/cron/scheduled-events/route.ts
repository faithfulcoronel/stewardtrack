/**
 * ================================================================================
 * SCHEDULED EVENTS CRON API ROUTE
 * ================================================================================
 *
 * This endpoint is called by Vercel Cron (or other cron services) to process
 * daily scheduled events like birthdays, anniversaries, and calendar reminders.
 *
 * Schedule: Daily at 6:00 AM UTC (configured in vercel.json)
 *
 * Security:
 * - Validates CRON_SECRET header to prevent unauthorized access
 * - Can also be triggered manually with the secret for testing
 *
 * Usage:
 * - Automatic: Vercel Cron calls this endpoint daily
 * - Manual: POST /api/cron/scheduled-events with Authorization: Bearer <CRON_SECRET>
 *
 * ================================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { ScheduledEventsService } from '@/services/ScheduledEventsService';

/**
 * Validate the cron secret to ensure request is authorized.
 */
function validateCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  // If no secret is configured, reject all requests (except in development)
  if (!cronSecret) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Cron] CRON_SECRET not configured, allowing in development mode');
      return true;
    }
    console.error('[Cron] CRON_SECRET not configured');
    return false;
  }

  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token === cronSecret) {
      return true;
    }
  }

  // Check Vercel Cron signature (Vercel sends this for cron jobs)
  const vercelCronSignature = request.headers.get('x-vercel-cron-signature');
  if (vercelCronSignature === cronSecret) {
    return true;
  }

  return false;
}

/**
 * GET /api/cron/scheduled-events
 *
 * Health check endpoint - returns status without processing.
 */
export async function GET(request: NextRequest) {
  // Allow health checks without authentication
  const searchParams = request.nextUrl.searchParams;
  const healthCheck = searchParams.get('health');

  if (healthCheck === 'true') {
    return NextResponse.json({
      status: 'ok',
      endpoint: '/api/cron/scheduled-events',
      message: 'Scheduled events cron job is configured',
      timestamp: new Date().toISOString(),
    });
  }

  // For actual processing, require authentication
  if (!validateCronSecret(request)) {
    console.error('[Cron] Unauthorized GET request to scheduled-events');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Process scheduled events
  return await processScheduledEvents('cron-get');
}

/**
 * POST /api/cron/scheduled-events
 *
 * Process scheduled events (birthdays, anniversaries, reminders).
 * This is the main entry point for the cron job.
 */
export async function POST(request: NextRequest) {
  if (!validateCronSecret(request)) {
    console.error('[Cron] Unauthorized POST request to scheduled-events');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Parse optional body for manual trigger info
  let triggeredBy = 'cron';
  try {
    const body = await request.json().catch(() => ({}));
    triggeredBy = body.triggeredBy || 'api';
  } catch {
    // Ignore body parsing errors
  }

  return await processScheduledEvents(triggeredBy);
}

/**
 * Process all scheduled events.
 */
async function processScheduledEvents(triggeredBy: string): Promise<NextResponse> {
  const startTime = Date.now();

  console.log(`[Cron] Starting scheduled events processing (triggered by: ${triggeredBy})`);

  try {
    const scheduledEventsService = container.get<ScheduledEventsService>(TYPES.ScheduledEventsService);

    const result = await scheduledEventsService.processScheduledEvents(triggeredBy);

    const response = {
      success: result.status !== 'failed',
      jobId: result.jobId,
      status: result.status,
      summary: {
        tenantsProcessed: result.tenantsProcessed,
        notificationsSent: result.notificationsSent,
        notificationsSkipped: result.notificationsSkipped,
        notificationsFailed: result.notificationsFailed,
      },
      details: result.details,
      durationMs: result.durationMs,
      timestamp: new Date().toISOString(),
      errors: result.errors.length > 0 ? result.errors : undefined,
    };

    console.log(`[Cron] Scheduled events processing completed:`, JSON.stringify(response.summary));

    // Return appropriate status code based on result
    if (result.status === 'failed') {
      return NextResponse.json(response, { status: 500 });
    } else if (result.status === 'partial') {
      return NextResponse.json(response, { status: 207 }); // Multi-Status
    } else {
      return NextResponse.json(response, { status: 200 });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Cron] Scheduled events processing failed:`, errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Configure route segment config for Vercel.
 * This ensures the route runs with appropriate timeout for cron jobs.
 */
export const maxDuration = 300; // 5 minutes max execution time
export const dynamic = 'force-dynamic';
