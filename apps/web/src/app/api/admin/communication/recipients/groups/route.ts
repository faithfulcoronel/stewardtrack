/**
 * API Route: GET /api/admin/communication/recipients/groups
 *
 * Returns recipient groups (families, events, ministries, custom lists).
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

    // Get events (schedules that are events)
    const { data: eventData } = await supabase
      .from('schedules')
      .select('id, title, registrations(count)')
      .eq('tenant_id', tenantId)
      .eq('schedule_type', 'event')
      .is('deleted_at', null)
      .order('start_date', { ascending: false })
      .limit(20);

    const events = (eventData ?? []).map((e: { id: string; title: string; registrations?: { count: number }[] }) => ({
      id: e.id,
      source: 'event' as const,
      name: e.title,
      memberCount: e.registrations?.[0]?.count ?? 0,
    }));

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

    return NextResponse.json({
      families,
      events,
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
