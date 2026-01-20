import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { DonationService } from '@/services/DonationService';
import type { IDonationRepository } from '@/repositories/donation.repository';
import { getCurrentTenantId } from '@/lib/server/context';
import type { CreateDonationDto, Donation } from '@/models/donation.model';

/**
 * POST /api/donations
 *
 * Create a new donation and initiate payment via Xendit.
 * Returns a payment URL for the donor to complete the transaction.
 *
 * Request Body:
 * - amount: number (required) - Donation amount in PHP
 * - category_id: string (required) - Donation category (Tithes, Offerings, etc.)
 * - payment_method_type: 'card' | 'ewallet' | 'bank_transfer' | 'direct_debit' (required)
 * - donor_email: string (required) - Donor's email address
 * - donor_name: string (optional) - Donor's full name
 * - donor_phone: string (optional) - Donor's phone number
 * - member_id: string (optional) - Member ID if logged in member
 * - fund_id: string (optional) - Target fund
 * - campaign_id: string (optional) - Campaign ID for campaign donations
 * - channel_code: string (optional) - E-wallet channel (GCASH, GRABPAY, etc.)
 * - anonymous: boolean (optional) - Hide donor name
 * - notes: string (optional) - Donation notes
 * - is_recurring: boolean (optional) - Set up recurring donation
 * - recurring_frequency: 'weekly' | 'monthly' | 'quarterly' | 'annually' (optional)
 * - save_payment_method: boolean (optional) - Save payment method for future use
 * - terms_accepted: boolean (required) - Donor accepted terms and conditions
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = await getCurrentTenantId();
    const donationService = container.get<DonationService>(TYPES.DonationService);

    // Parse request body
    const body: CreateDonationDto = await request.json();

    // Validate required fields
    if (!body.amount || body.amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid donation amount is required' },
        { status: 400 }
      );
    }

    if (!body.category_id) {
      return NextResponse.json(
        { success: false, error: 'Donation category is required' },
        { status: 400 }
      );
    }

    if (!body.payment_method_type) {
      return NextResponse.json(
        { success: false, error: 'Payment method type is required' },
        { status: 400 }
      );
    }

    if (!body.donor_email) {
      return NextResponse.json(
        { success: false, error: 'Donor email is required' },
        { status: 400 }
      );
    }

    if (!body.terms_accepted) {
      return NextResponse.json(
        { success: false, error: 'Terms and conditions must be accepted' },
        { status: 400 }
      );
    }

    // Create donation and get payment URL
    const result = await donationService.createDonation(body, tenantId);

    return NextResponse.json({
      success: true,
      data: result,
    }, { status: 201 });
  } catch (error: any) {
    console.error('[Donations API] Error creating donation:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create donation',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/donations
 *
 * List donations for the tenant.
 *
 * Query Parameters:
 * - status: Filter by status (pending, paid, failed, refunded, expired)
 * - member_id: Filter by member
 * - campaign_id: Filter by campaign
 * - limit: Number of results (default: 50)
 * - offset: Pagination offset
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = await getCurrentTenantId();
    const donationRepository = container.get<IDonationRepository>(
      TYPES.IDonationRepository
    );

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const memberId = searchParams.get('member_id');
    const campaignId = searchParams.get('campaign_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let donations: Donation[] = [];

    if (memberId) {
      donations = await donationRepository.findByMemberId(memberId, tenantId);
    } else if (campaignId) {
      donations = await donationRepository.findByCampaignId(campaignId, tenantId);
    } else {
      // Get donations by member or campaign if specified, otherwise use base findAll
      // Note: findAll from BaseRepository returns { data, count }
      const result = await donationRepository.findAll();
      donations = result?.data || [];
    }

    // Filter by status if provided
    if (status && donations.length > 0) {
      donations = donations.filter((d: Donation) => d.status === status);
    }

    // Apply pagination for non-filtered results
    const paginatedDonations = donations.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: paginatedDonations,
      meta: {
        limit,
        offset,
        total: donations.length,
      },
    });
  } catch (error: any) {
    console.error('[Donations API] Error fetching donations:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch donations',
      },
      { status: 500 }
    );
  }
}
