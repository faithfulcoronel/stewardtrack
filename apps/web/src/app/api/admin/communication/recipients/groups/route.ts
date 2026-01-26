/**
 * API Route: GET /api/admin/communication/recipients/groups
 *
 * Returns recipient groups (families, events, ministries, registrants, custom lists).
 */

import { NextResponse } from 'next/server';
import { getCurrentTenantId } from '@/lib/server/context';
import { createSupabaseServerClient as createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const tenantId = await getCurrentTenantId();
    const supabase = await createClient();

    // Get families (accounts with type='family')
    const { data: familyData } = await supabase
      .from('accounts')
      .select('id, name, account_members(count)')
      .eq('tenant_id', tenantId)
      .eq('account_type', 'family')
      .is('deleted_at', null);

    const families = (familyData ?? []).map((f: { id: string; name: string; account_members?: { count: number }[] }) => ({
      id: f.id,
      source: 'family' as const,
      name: f.name,
      memberCount: f.account_members?.[0]?.count ?? 0,
    }));

    // Get events (ministry_schedules with registration_required) - for member attendees
    const { data: eventData, error: eventError } = await supabase
      .from('ministry_schedules')
      .select('id, name, recurrence_start_date')
      .eq('tenant_id', tenantId)
      .eq('registration_required', true)
      .is('deleted_at', null)
      .order('recurrence_start_date', { ascending: false })
      .limit(20);

    if (eventError) {
      console.error('Failed to fetch events:', eventError);
    }

    // Build events array with registration counts
    const events: Array<{
      id: string;
      source: 'event';
      name: string;
      memberCount: number;
    }> = [];

    for (const schedule of (eventData ?? [])) {
      // Count member registrations for this event
      const { count } = await supabase
        .from('schedule_registrations')
        .select('id, occurrence:schedule_occurrences!inner(schedule_id)', { count: 'exact', head: true })
        .eq('occurrence.schedule_id', schedule.id)
        .eq('tenant_id', tenantId)
        .not('member_id', 'is', null) // Only count member registrations for "events" source
        .in('status', ['registered', 'waitlisted', 'checked_in']);

      events.push({
        id: schedule.id,
        source: 'event' as const,
        name: schedule.name,
        memberCount: count ?? 0,
      });
    }

    console.log(`[groups] Found ${events.length} events for tenant ${tenantId}`);

    // Get registrants - events with ALL registrations (members + guests)
    // Reuse the same schedule data from events query above, but count ALL registrations
    const registrants: Array<{
      id: string;
      source: 'registrant';
      name: string;
      description?: string;
      memberCount: number;
    }> = [];

    for (const schedule of (eventData ?? [])) {
      // Count ALL registrations (members + guests) for this schedule
      const { count } = await supabase
        .from('schedule_registrations')
        .select('id, occurrence:schedule_occurrences!inner(schedule_id)', { count: 'exact', head: true })
        .eq('occurrence.schedule_id', schedule.id)
        .eq('tenant_id', tenantId)
        .in('status', ['registered', 'waitlisted', 'checked_in']);

      if (count && count > 0) {
        registrants.push({
          id: schedule.id,
          source: 'registrant' as const,
          name: schedule.name,
          description: schedule.recurrence_start_date ? `Event on ${new Date(schedule.recurrence_start_date).toLocaleDateString()}` : undefined,
          memberCount: count,
        });
      }
    }

    console.log(`[groups] Found ${registrants.length} registrants for tenant ${tenantId}`);

    // Get ministries
    const { data: ministryData } = await supabase
      .from('ministries')
      .select('id, name, ministry_members(count)')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);

    const ministries = (ministryData ?? []).map((m: { id: string; name: string; ministry_members?: { count: number }[] }) => ({
      id: m.id,
      source: 'ministry' as const,
      name: m.name,
      memberCount: m.ministry_members?.[0]?.count ?? 0,
    }));

    // Custom lists would come from a communication_lists table (future feature)
    const customLists: Array<{ id: string; source: 'list'; name: string; memberCount: number }> = [];

    console.log(`[groups] Returning: ${families.length} families, ${events.length} events, ${registrants.length} registrants, ${ministries.length} ministries`);

    return NextResponse.json({
      families,
      events,
      registrants,
      ministries,
      customLists,
    });
  } catch (error) {
    console.error('Failed to load recipient groups:', error);
    return NextResponse.json(
      { error: 'Failed to load recipient groups' },
      { status: 500 }
    );
  }
}
