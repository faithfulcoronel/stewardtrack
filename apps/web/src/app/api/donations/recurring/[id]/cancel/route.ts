import { NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { RecurringDonationService } from '@/services/RecurringDonationService';
import type { IDonationRepository } from '@/repositories/donation.repository';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/donations/recurring/[id]/cancel
 *
 * Cancel a recurring donation permanently
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const { id: donationId } = await params;
    const tenantId = await getCurrentTenantId();
    const userId = await getCurrentUserId();

    // Parse optional reason from request body
    let reason: string | undefined;
    try {
      const body = await request.json();
      reason = body.reason;
    } catch {
      // No body or invalid JSON - that's fine, reason is optional
    }

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

    // Verify ownership
    const donation = await donationRepository.getDonationWithDetails(donationId, tenantId);
    if (!donation) {
      return NextResponse.json(
        { error: 'Recurring donation not found' },
        { status: 404 }
      );
    }

    if (donation.member_id !== member.id) {
      return NextResponse.json(
        { error: 'Unauthorized access to this donation' },
        { status: 403 }
      );
    }

    const recurringDonationService = container.get<RecurringDonationService>(
      TYPES.RecurringDonationService
    );

    const updatedDonation = await recurringDonationService.cancelRecurringDonation(
      donationId,
      tenantId,
      reason
    );

    return NextResponse.json({
      data: updatedDonation,
      message: 'Recurring donation cancelled successfully',
    });
  } catch (error) {
    console.error('[API] Error cancelling recurring donation:', error);
    const message = error instanceof Error ? error.message : 'Failed to cancel recurring donation';
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
