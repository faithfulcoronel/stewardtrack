import { NextResponse } from 'next/server';
import 'reflect-metadata';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { PaymentService } from '@/services/PaymentService';
import { getCurrentTenantId } from '@/lib/server/context';

/**
 * GET /api/subscription/transactions
 *
 * Fetches all payment transactions for the authenticated user's tenant.
 *
 * Query parameters:
 * - limit?: number (default: 50)
 * - offset?: number (default: 0)
 * - status?: string (optional filter by payment status)
 *
 * Returns:
 * - transactions: Array of payment records with details
 */
export async function GET(request: Request) {
  try {
    // Get current tenant ID
    const tenantId = await getCurrentTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context available' }, { status: 400 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status') as any;

    // Get payment service from DI container
    const paymentService = container.get<PaymentService>(TYPES.PaymentService);

    // Fetch tenant payments
    const transactions = await paymentService.getTenantPayments(tenantId, {
      limit,
      offset,
      ...(status && { status }),
    });

    return NextResponse.json({
      transactions: transactions.map((tx) => ({
        id: tx.id,
        external_id: tx.external_id,
        xendit_invoice_id: tx.xendit_invoice_id,
        amount: tx.amount,
        currency: tx.currency,
        status: tx.status,
        invoice_url: tx.invoice_url,
        payment_method: tx.payment_method,
        payment_channel: tx.payment_channel,
        payer_email: tx.payer_email,
        description: tx.description,
        paid_at: tx.paid_at,
        failed_at: tx.failed_at,
        failure_reason: tx.failure_reason,
        created_at: tx.created_at,
        updated_at: tx.updated_at,
        metadata: tx.metadata,
      })),
      pagination: {
        limit,
        offset,
        total: transactions.length,
      },
    });
  } catch (error) {
    console.error('Error fetching subscription transactions:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch subscription transactions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
