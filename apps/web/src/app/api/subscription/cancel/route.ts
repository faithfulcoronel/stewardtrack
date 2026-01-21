import { NextRequest, NextResponse } from 'next/server';
import { getCurrentTenantId } from '@/lib/server/context';
import { container } from '@/lib/container';
import { TenantService } from '@/services/TenantService';
import { TYPES } from '@/lib/types';
import { getSupabaseServiceClient } from '@/lib/supabase/service';

/**
 * POST /api/subscription/cancel
 *
 * Cancels the current subscription for the authenticated tenant.
 * This sets the subscription_status to 'cancelled'.
 * The subscription will remain active until the end of the current billing period.
 *
 * Architecture: Route -> Service -> Repository -> Adapter -> Supabase
 *
 * Request body:
 * - reason?: string (optional cancellation reason)
 * - immediate?: boolean (if true, cancel immediately; default is false - cancel at end of period)
 */

export async function POST(request: NextRequest) {
  try {
    const tenantId = await getCurrentTenantId();

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context available' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { reason, immediate = false } = body;

    // Get service from DI container
    const tenantService = container.get<TenantService>(TYPES.TenantService);

    // Cancel subscription via service layer
    const result = await tenantService.cancelSubscription(tenantId, reason, immediate);

    // Log the cancellation event using service role client
    const supabase = await getSupabaseServiceClient();
    await supabase.from('billing_events').insert({
      event_id: `cancel-${tenantId}-${Date.now()}`,
      event_type: 'subscription.cancelled',
      tenant_id: tenantId,
      payload: {
        reason: reason || 'User requested cancellation',
        immediate,
        cancelled_at: new Date().toISOString(),
        previous_status: result.previousStatus,
      },
      processed: true,
      processed_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: immediate
        ? 'Subscription cancelled immediately'
        : 'Subscription will be cancelled at the end of your billing period',
      effective_date: result.effectiveDate,
    });
  } catch (error: any) {
    console.error('[Subscription Cancel] Error:', error);

    // Handle specific errors
    if (error.message === 'Subscription is already cancelled') {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (error.message === 'Tenant not found') {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to cancel subscription', details: error.message },
      { status: 500 }
    );
  }
}
