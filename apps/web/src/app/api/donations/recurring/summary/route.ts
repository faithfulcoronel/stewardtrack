import { NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { RecurringDonationService } from '@/services/RecurringDonationService';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * GET /api/donations/recurring/summary
 *
 * Get summary of all recurring donations for the current member
 * Includes totals like total charges and total amount donated
 */
export async function GET() {
  try {
    const tenantId = await getCurrentTenantId();
    const userId = await getCurrentUserId();

    // Get member ID from user
    const supabase = await createSupabaseServerClient();
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'Member not found. You must be linked to a member profile.' },
        { status: 404 }
      );
    }

    const recurringDonationService = container.get<RecurringDonationService>(
      TYPES.RecurringDonationService
    );

    const summaries = await recurringDonationService.getMemberRecurringSummary(
      member.id,
      tenantId
    );

    // Calculate overall totals
    const overall = {
      total_recurring_donations: summaries.length,
      active_count: summaries.filter(s => s.status === 'active').length,
      paused_count: summaries.filter(s => s.status === 'paused').length,
      cancelled_count: summaries.filter(s => s.status === 'cancelled').length,
      total_monthly_commitment: summaries
        .filter(s => s.status === 'active')
        .reduce((sum, s) => {
          // Normalize to monthly for comparison
          switch (s.frequency) {
            case 'weekly':
              return sum + (s.amount * 4.33); // ~4.33 weeks per month
            case 'monthly':
              return sum + s.amount;
            case 'quarterly':
              return sum + (s.amount / 3);
            case 'annually':
              return sum + (s.amount / 12);
            default:
              return sum + s.amount;
          }
        }, 0),
      lifetime_donations: summaries.reduce((sum, s) => sum + s.total_amount_donated, 0),
    };

    return NextResponse.json({
      data: {
        summaries,
        overall,
      },
    });
  } catch (error) {
    console.error('[API] Error fetching recurring donation summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recurring donation summary' },
      { status: 500 }
    );
  }
}
