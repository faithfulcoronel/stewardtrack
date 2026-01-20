/**
 * ================================================================================
 * SCHEDULED DISBURSEMENTS CRON API ROUTE
 * ================================================================================
 *
 * This endpoint is called by Vercel Cron to process scheduled disbursements.
 * It creates and processes payouts for tenants with scheduled disbursement
 * configurations (daily, weekly, monthly).
 *
 * Schedule: Daily at 3:00 AM UTC (configured in vercel.json)
 *
 * Security:
 * - Validates CRON_SECRET header to prevent unauthorized access
 * - Can also be triggered manually with the secret for testing
 *
 * IMPORTANT: Bank account details are managed in Xendit Dashboard.
 * This cron job only triggers payouts using Xendit channel references.
 *
 * ================================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { DisbursementService, ProcessDisbursementsResult } from '@/services/DisbursementService';

/**
 * Validate the cron secret to ensure request is authorized.
 */
function validateCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

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

  // Check Vercel Cron signature
  const vercelCronSignature = request.headers.get('x-vercel-cron-signature');
  if (vercelCronSignature === cronSecret) {
    return true;
  }

  return false;
}

/**
 * Get the schedule to process based on the day of the week/month
 */
function getSchedulesToProcess(): Array<'daily' | 'weekly' | 'monthly'> {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const dayOfMonth = now.getDate();

  const schedules: Array<'daily' | 'weekly' | 'monthly'> = ['daily'];

  // Weekly: Process on Mondays (day 1)
  if (dayOfWeek === 1) {
    schedules.push('weekly');
  }

  // Monthly: Process on the 1st of each month
  if (dayOfMonth === 1) {
    schedules.push('monthly');
  }

  return schedules;
}

/**
 * GET /api/cron/disbursements
 *
 * Health check endpoint
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const healthCheck = searchParams.get('health');

  if (healthCheck === 'true') {
    return NextResponse.json({
      status: 'ok',
      endpoint: '/api/cron/disbursements',
      message: 'Scheduled disbursements cron job is configured',
      schedules_today: getSchedulesToProcess(),
      timestamp: new Date().toISOString(),
    });
  }

  if (!validateCronSecret(request)) {
    console.error('[Cron] Unauthorized GET request to disbursements');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return await processScheduledDisbursements('cron-get');
}

/**
 * POST /api/cron/disbursements
 *
 * Process scheduled disbursements for all tenants.
 */
export async function POST(request: NextRequest) {
  if (!validateCronSecret(request)) {
    console.error('[Cron] Unauthorized POST request to disbursements');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  let triggeredBy = 'cron';
  let scheduleOverride: string | undefined;

  try {
    const body = await request.json().catch(() => ({}));
    triggeredBy = body.triggeredBy || 'api';
    scheduleOverride = body.schedule; // Optional: override schedule for testing
  } catch {
    // Ignore body parsing errors
  }

  return await processScheduledDisbursements(triggeredBy, scheduleOverride);
}

/**
 * Process scheduled disbursements for all tenants.
 */
async function processScheduledDisbursements(
  triggeredBy: string,
  scheduleOverride?: string
): Promise<NextResponse> {
  const startTime = Date.now();
  const schedulesToProcess = scheduleOverride
    ? [scheduleOverride as 'daily' | 'weekly' | 'monthly']
    : getSchedulesToProcess();

  console.log(`[Cron] Starting scheduled disbursements processing (triggered by: ${triggeredBy}, schedules: ${schedulesToProcess.join(', ')})`);

  try {
    const disbursementService = container.get<DisbursementService>(TYPES.DisbursementService);

    const allResults: ProcessDisbursementsResult[] = [];
    const errors: Array<{ schedule: string; tenant_id: string; error: string }> = [];

    // Process each schedule
    for (const schedule of schedulesToProcess) {
      console.log(`[Cron] Processing ${schedule} disbursements...`);

      // Get tenants with this schedule configured
      const tenantsWithSchedule = await disbursementService.getTenantsWithScheduledDisbursements(schedule);

      if (tenantsWithSchedule.length === 0) {
        console.log(`[Cron] No tenants found with ${schedule} disbursement schedule`);
        continue;
      }

      console.log(`[Cron] Found ${tenantsWithSchedule.length} tenant(s) with ${schedule} schedule`);

      // Process each tenant
      for (const { tenant_id, source_id } of tenantsWithSchedule) {
        try {
          const result = await disbursementService.processScheduledDisbursementsForTenant(
            tenant_id,
            source_id,
            schedule
          );

          if (result.disbursements_created > 0) {
            allResults.push(result);
            console.log(
              `[Cron] Tenant ${tenant_id}: created ${result.disbursements_created}, ` +
              `processed ${result.disbursements_processed}, failed ${result.disbursements_failed}`
            );
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`[Cron] Error processing ${schedule} disbursement for tenant ${tenant_id}:`, errorMessage);
          errors.push({
            schedule,
            tenant_id,
            error: errorMessage,
          });
        }
      }
    }

    // Aggregate totals
    const totals = allResults.reduce(
      (acc, r) => ({
        disbursements_created: acc.disbursements_created + r.disbursements_created,
        disbursements_processed: acc.disbursements_processed + r.disbursements_processed,
        disbursements_failed: acc.disbursements_failed + r.disbursements_failed,
        total_amount: acc.total_amount + r.total_amount,
      }),
      { disbursements_created: 0, disbursements_processed: 0, disbursements_failed: 0, total_amount: 0 }
    );

    const response = {
      success: errors.length === 0,
      triggeredBy,
      schedulesProcessed: schedulesToProcess,
      summary: {
        tenantsProcessed: allResults.length,
        tenantsWithErrors: errors.length,
        disbursementsCreated: totals.disbursements_created,
        disbursementsProcessed: totals.disbursements_processed,
        disbursementsFailed: totals.disbursements_failed,
        totalAmount: totals.total_amount,
      },
      results: allResults.map(r => ({
        tenant_id: r.tenant_id,
        created: r.disbursements_created,
        processed: r.disbursements_processed,
        failed: r.disbursements_failed,
        amount: r.total_amount,
      })),
      errors: errors.length > 0 ? errors : undefined,
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };

    console.log(`[Cron] Scheduled disbursements processing completed:`, JSON.stringify(response.summary));

    // Return appropriate status code
    if (errors.length > 0 && allResults.length === 0) {
      return NextResponse.json(response, { status: 500 });
    } else if (errors.length > 0) {
      return NextResponse.json(response, { status: 207 }); // Multi-Status
    } else {
      return NextResponse.json(response, { status: 200 });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Cron] Scheduled disbursements processing failed:`, errorMessage);

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
 */
export const maxDuration = 300; // 5 minutes max execution time
export const dynamic = 'force-dynamic';
