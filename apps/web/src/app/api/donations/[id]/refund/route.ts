import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { DonationService } from '@/services/DonationService';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';

/**
 * POST /api/donations/[id]/refund
 *
 * Process a refund for a paid donation.
 *
 * Request Body:
 * - reason: string (required) - Reason for the refund
 *
 * Requirements:
 * - Donation must be in 'paid' status
 * - User must have permission to process refunds
 * - Refunds go through Xendit and may take 5-14 business days
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = await getCurrentTenantId();
    const userId = await getCurrentUserId();
    const { id: donationId } = await params;

    const body = await request.json();

    // Validate reason
    if (!body.reason || body.reason.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: 'A valid refund reason is required (minimum 5 characters)' },
        { status: 400 }
      );
    }

    const donationService = container.get<DonationService>(TYPES.DonationService);

    // Process refund
    const donation = await donationService.processRefund(
      donationId,
      tenantId,
      body.reason
    );

    console.log('[Donations API] Refund processed:', {
      donationId,
      userId,
      reason: body.reason,
    });

    return NextResponse.json({
      success: true,
      data: donation,
      message: 'Refund has been initiated. It may take 5-14 business days to process.',
    });
  } catch (error: any) {
    console.error('[Donations API] Error processing refund:', error);

    // Handle specific error cases
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { success: false, error: 'Donation not found' },
        { status: 404 }
      );
    }

    if (error.message?.includes('only refund paid')) {
      return NextResponse.json(
        { success: false, error: 'Only paid donations can be refunded' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process refund',
      },
      { status: 500 }
    );
  }
}
