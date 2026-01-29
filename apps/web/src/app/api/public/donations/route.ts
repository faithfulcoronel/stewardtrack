import 'server-only';
import 'reflect-metadata';
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { DonationService } from '@/services/DonationService';
import type { FinancialSourceService } from '@/services/FinancialSourceService';
import { decodeTenantToken } from '@/lib/tokens/shortUrlTokens';
import { LicenseGate } from '@/lib/access-gate';
import type { CreateDonationDto } from '@/models/donation.model';

// Force Node.js runtime for this route
export const runtime = 'nodejs';

/**
 * POST /api/public/donations
 *
 * Public endpoint to create a donation.
 * Uses tenant token instead of authenticated tenant context.
 *
 * Request Body:
 * - tenantToken: string (required) - Encoded tenant token
 * - amount: number (required) - Donation amount in PHP
 * - category_id: string (required) - Donation category (Tithes, Offerings, etc.)
 * - payment_method_type: 'card' | 'ewallet' | 'bank_transfer' | 'direct_debit' (required)
 * - donor_email: string (required) - Donor's email address
 * - donor_name: string (optional) - Donor's full name
 * - donor_phone: string (optional) - Donor's phone number
 * - fund_id: string (optional) - Target fund
 * - campaign_id: string (optional) - Campaign ID for campaign donations
 * - channel_code: string (optional) - E-wallet channel (GCASH, GRABPAY, etc.)
 * - anonymous: boolean (optional) - Hide donor name
 * - notes: string (optional) - Donation notes
 * - terms_accepted: boolean (required) - Donor accepted terms and conditions
 * - member_id: string (optional) - Member ID for authenticated donors (links donation to their account)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate tenant token
    const { tenantToken, ...donationData } = body;

    if (!tenantToken) {
      return NextResponse.json(
        { success: false, error: 'Tenant token is required' },
        { status: 400 }
      );
    }

    const tenantId = decodeTenantToken(tenantToken);
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Invalid tenant token' },
        { status: 400 }
      );
    }

    // Check license for online donations feature
    const licenseGate = new LicenseGate('online.donations');
    const licenseResult = await licenseGate.check('public', tenantId);
    if (!licenseResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Online donations are not enabled for this organization', requiresUpgrade: true },
        { status: 403 }
      );
    }

    // Validate required fields
    if (!donationData.amount || donationData.amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid donation amount is required' },
        { status: 400 }
      );
    }

    if (!donationData.category_id) {
      return NextResponse.json(
        { success: false, error: 'Donation category is required' },
        { status: 400 }
      );
    }

    if (!donationData.payment_method_type) {
      return NextResponse.json(
        { success: false, error: 'Payment method type is required' },
        { status: 400 }
      );
    }

    if (!donationData.donor_email) {
      return NextResponse.json(
        { success: false, error: 'Donor email is required' },
        { status: 400 }
      );
    }

    if (!donationData.terms_accepted) {
      return NextResponse.json(
        { success: false, error: 'Terms and conditions must be accepted' },
        { status: 400 }
      );
    }

    // Check if online donations are properly configured (financial source with payout settings)
    const financialSourceService = container.get<FinancialSourceService>(TYPES.FinancialSourceService);
    const donationDestination = await financialSourceService.getDonationDestination(tenantId);

    if (!donationDestination) {
      return NextResponse.json(
        {
          success: false,
          error: 'Online donations are not available for this organization. Please contact the church administrator.'
        },
        { status: 400 }
      );
    }

    const donationService = container.get<DonationService>(TYPES.DonationService);

    // Create donation with decoded tenant ID
    const createDto: CreateDonationDto = {
      amount: donationData.amount,
      category_id: donationData.category_id,
      payment_method_type: donationData.payment_method_type,
      donor_email: donationData.donor_email,
      donor_name: donationData.donor_name,
      donor_phone: donationData.donor_phone,
      fund_id: donationData.fund_id,
      campaign_id: donationData.campaign_id,
      channel_code: donationData.channel_code,
      anonymous: donationData.anonymous,
      notes: donationData.notes,
      terms_accepted: donationData.terms_accepted,
      terms_version: donationData.terms_version || 'v1.0',
      // Include member_id if provided (for authenticated donors)
      member_id: donationData.member_id,
    };

    // Use createPublicDonation which uses service role to bypass RLS for unauthenticated users
    const result = await donationService.createPublicDonation(createDto, tenantId);

    return NextResponse.json({
      success: true,
      data: result,
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('[Public Donations API] Error creating donation:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create donation',
      },
      { status: 500 }
    );
  }
}
