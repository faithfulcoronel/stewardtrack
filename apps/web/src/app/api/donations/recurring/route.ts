import { NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { RecurringDonationService } from '@/services/RecurringDonationService';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * GET /api/donations/recurring
 *
 * Get all recurring donations for the current member
 * Query params:
 *   - status: filter by status (active, paused, cancelled, completed)
 */
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'active' | 'paused' | 'cancelled' | 'completed' | null;

    const recurringDonationService = container.get<RecurringDonationService>(
      TYPES.RecurringDonationService
    );

    const donations = await recurringDonationService.getMemberRecurringDonations(
      member.id,
      tenantId,
      status || undefined
    );

    return NextResponse.json({ data: donations });
  } catch (error) {
    console.error('[API] Error fetching recurring donations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recurring donations' },
      { status: 500 }
    );
  }
}
