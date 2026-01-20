import { NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { RecurringDonationService } from '@/services/RecurringDonationService';
import type { IDonationRepository } from '@/repositories/donation.repository';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/donations/recurring/[id]
 *
 * Get details of a specific recurring donation including charge history
 */
export async function GET(request: Request, { params }: Params) {
  try {
    const { id: donationId } = await params;
    const tenantId = await getCurrentTenantId();
    const userId = await getCurrentUserId();

    // Verify member owns this donation
    const supabase = await createSupabaseServerClient();
    const { data: member } = await supabase
      .from('members')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .single();

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    const donationRepository = container.get<IDonationRepository>(
      TYPES.IDonationRepository
    );
    const recurringDonationService = container.get<RecurringDonationService>(
      TYPES.RecurringDonationService
    );

    // Get donation
    const donation = await donationRepository.getDonationWithDetails(donationId, tenantId);

    if (!donation) {
      return NextResponse.json(
        { error: 'Recurring donation not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (donation.member_id !== member.id) {
      return NextResponse.json(
        { error: 'Unauthorized access to this donation' },
        { status: 403 }
      );
    }

    if (!donation.is_recurring) {
      return NextResponse.json(
        { error: 'This is not a recurring donation' },
        { status: 400 }
      );
    }

    // Get charge history
    const chargeHistory = await recurringDonationService.getChargeHistory(
      donationId,
      tenantId
    );

    return NextResponse.json({
      data: {
        donation,
        charge_history: chargeHistory,
      },
    });
  } catch (error) {
    console.error('[API] Error fetching recurring donation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recurring donation' },
      { status: 500 }
    );
  }
}
