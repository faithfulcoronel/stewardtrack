import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AICreditPurchaseService } from '@/services/AICreditPurchaseService';
import type { IAICreditPurchaseRepository } from '@/repositories/aiCreditPurchase.repository';

/**
 * POST /api/ai-credits/process-pending
 *
 * Manual endpoint to process pending purchases (for local testing without webhooks)
 * This simulates what the Xendit webhook would do
 */
export async function POST(request: NextRequest) {
  try {
    const { purchaseId } = await request.json();

    if (!purchaseId) {
      return NextResponse.json(
        { success: false, error: 'Purchase ID is required' },
        { status: 400 }
      );
    }

    const purchaseService = container.get<AICreditPurchaseService>(
      TYPES.AICreditPurchaseService
    );
    const purchaseRepo = container.get<IAICreditPurchaseRepository>(
      TYPES.IAICreditPurchaseRepository
    );

    // Get the purchase
    const purchase = await purchaseRepo.findById(purchaseId);

    if (!purchase) {
      return NextResponse.json(
        { success: false, error: 'Purchase not found' },
        { status: 404 }
      );
    }

    if (!purchase.xendit_invoice_id) {
      return NextResponse.json(
        { success: false, error: 'Purchase has no Xendit invoice ID' },
        { status: 400 }
      );
    }

    // Process the purchase (this is what the webhook would do)
    await purchaseService.processPaidPurchase(purchase.xendit_invoice_id);

    return NextResponse.json({
      success: true,
      message: 'Purchase processed successfully',
      purchaseId: purchase.id,
      credits: purchase.credits_purchased,
    });
  } catch (error: any) {
    console.error('[Process Pending] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process purchase',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai-credits/process-pending
 *
 * Get all pending purchases for manual processing
 */
export async function GET(request: NextRequest) {
  try {
    const purchaseRepo = container.get<IAICreditPurchaseRepository>(
      TYPES.IAICreditPurchaseRepository
    );

    // Get tenant ID from session
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const pendingPurchases = await purchaseRepo.getPendingPurchases(tenantId);

    return NextResponse.json({
      success: true,
      purchases: pendingPurchases.map(p => ({
        id: p.id,
        credits: p.credits_purchased,
        amount: p.amount_paid,
        currency: p.currency,
        xendit_invoice_id: p.xendit_invoice_id,
        created_at: p.created_at,
      })),
    });
  } catch (error: any) {
    console.error('[Process Pending] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get pending purchases',
      },
      { status: 500 }
    );
  }
}
