import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { DonationService } from '@/services/DonationService';
import { getCurrentTenantId } from '@/lib/server/context';

/**
 * GET /api/donations/[id]
 *
 * Get donation details with decrypted PII (if authorized).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = await getCurrentTenantId();
    const { id: donationId } = await params;

    const donationService = container.get<DonationService>(TYPES.DonationService);

    const donation = await donationService.getDonationWithDetails(donationId, tenantId);

    if (!donation) {
      return NextResponse.json(
        { success: false, error: 'Donation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: donation,
    });
  } catch (error: any) {
    console.error('[Donations API] Error fetching donation:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch donation',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/donations/[id]/refund
 *
 * Request a refund for a donation.
 *
 * Request Body:
 * - reason: string (required) - Reason for refund
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = await getCurrentTenantId();
    const { id: donationId } = await params;

    // Check if this is a refund request
    const url = new URL(request.url);
    if (!url.pathname.endsWith('/refund')) {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }

    const body = await request.json();

    if (!body.reason) {
      return NextResponse.json(
        { success: false, error: 'Refund reason is required' },
        { status: 400 }
      );
    }

    const donationService = container.get<DonationService>(TYPES.DonationService);

    const donation = await donationService.processRefund(
      donationId,
      tenantId,
      body.reason
    );

    return NextResponse.json({
      success: true,
      data: donation,
      message: 'Refund processed successfully',
    });
  } catch (error: any) {
    console.error('[Donations API] Error processing refund:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process refund',
      },
      { status: 500 }
    );
  }
}
