/**
 * ================================================================================
 * RECURRING DONATIONS CRON API ROUTE
 * ================================================================================
 *
 * This endpoint is called by Vercel Cron to process recurring donations.
 * It charges all recurring donations that are due for processing.
 *
 * Schedule: Daily at 2:00 AM UTC (configured in vercel.json)
 *
 * Security:
 * - Validates CRON_SECRET header to prevent unauthorized access
 * - Can also be triggered manually with the secret for testing
 *
 * Usage:
 * - Automatic: Vercel Cron calls this endpoint daily
 * - Manual: POST /api/cron/recurring-donations with Authorization: Bearer <CRON_SECRET>
 *
 * ================================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { RecurringDonationService } from '@/services/RecurringDonationService';
import type { IRecurringChargeHistoryRepository } from '@/repositories/recurringChargeHistory.repository';
import type { ProcessRecurringDonationsResult } from '@/models/donation.model';

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
 * GET /api/cron/recurring-donations
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
      endpoint: '/api/cron/recurring-donations',
      message: 'Recurring donations cron job is configured',
      timestamp: new Date().toISOString(),
    });
  }

  // For actual processing, require authentication
  if (!validateCronSecret(request)) {
    console.error('[Cron] Unauthorized GET request to recurring-donations');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Process recurring donations
  return await processRecurringDonations('cron-get');
}

/**
 * POST /api/cron/recurring-donations
 *
 * Process all due recurring donations for all tenants.
 * This is the main entry point for the cron job.
 */
export async function POST(request: NextRequest) {
  if (!validateCronSecret(request)) {
    console.error('[Cron] Unauthorized POST request to recurring-donations');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Parse optional body for manual trigger info
  let triggeredBy = 'cron';
  let processDate: string | undefined;

  try {
    const body = await request.json().catch(() => ({}));
    triggeredBy = body.triggeredBy || 'api';
    processDate = body.processDate; // Optional: override process date for testing
  } catch {
    // Ignore body parsing errors
  }

  return await processRecurringDonations(triggeredBy, processDate);
}

/**
 * Process recurring donations for all tenants.
 */
async function processRecurringDonations(
  triggeredBy: string,
  processDate?: string
): Promise<NextResponse> {
  const startTime = Date.now();
  const effectiveProcessDate = processDate || new Date().toISOString().split('T')[0];

  console.log(`[Cron] Starting recurring donations processing (triggered by: ${triggeredBy}, date: ${effectiveProcessDate})`);

  try {
    // Get repository and service from DI container
    const chargeHistoryRepository = container.get<IRecurringChargeHistoryRepository>(
      TYPES.IRecurringChargeHistoryRepository
    );
    const recurringDonationService = container.get<RecurringDonationService>(
      TYPES.RecurringDonationService
    );

    // Get all active tenants via repository
    const tenants = await chargeHistoryRepository.getAllActiveTenants();

    if (tenants.length === 0) {
      console.log('[Cron] No active tenants found');
      return NextResponse.json({
        success: true,
        message: 'No active tenants to process',
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
    }

    const results: ProcessRecurringDonationsResult[] = [];
    const errors: Array<{ tenantId: string; tenantName: string; error: string }> = [];

    // Process each tenant
    for (const tenant of tenants) {
      try {
        console.log(`[Cron] Processing recurring donations for tenant: ${tenant.name} (${tenant.id})`);

        const result = await recurringDonationService.processRecurringDonationsForTenant(
          tenant.id,
          effectiveProcessDate
        );

        results.push(result);

        console.log(`[Cron] Tenant ${tenant.name}: ${result.successful} succeeded, ${result.failed} failed, ${result.skipped} skipped`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Cron] Error processing tenant ${tenant.name}:`, errorMessage);
        errors.push({
          tenantId: tenant.id,
          tenantName: tenant.name,
          error: errorMessage,
        });
      }
    }

    // Aggregate totals
    const totals = results.reduce(
      (acc, r) => ({
        total_processed: acc.total_processed + r.total_processed,
        successful: acc.successful + r.successful,
        failed: acc.failed + r.failed,
        skipped: acc.skipped + r.skipped,
      }),
      { total_processed: 0, successful: 0, failed: 0, skipped: 0 }
    );

    const response = {
      success: errors.length === 0,
      triggeredBy,
      processDate: effectiveProcessDate,
      summary: {
        tenantsProcessed: tenants.length,
        tenantsWithErrors: errors.length,
        totalDonationsProcessed: totals.total_processed,
        successful: totals.successful,
        failed: totals.failed,
        skipped: totals.skipped,
      },
      results: results.map(r => ({
        tenant_id: r.tenant_id,
        total: r.total_processed,
        successful: r.successful,
        failed: r.failed,
        skipped: r.skipped,
      })),
      errors: errors.length > 0 ? errors : undefined,
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };

    console.log(`[Cron] Recurring donations processing completed:`, JSON.stringify(response.summary));

    // Return appropriate status code
    if (errors.length === tenants.length) {
      // All tenants failed
      return NextResponse.json(response, { status: 500 });
    } else if (errors.length > 0) {
      // Some tenants failed
      return NextResponse.json(response, { status: 207 }); // Multi-Status
    } else {
      return NextResponse.json(response, { status: 200 });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Cron] Recurring donations processing failed:`, errorMessage);

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
