/**
 * API Route: GET /api/admin/communication/recipients/[source]/[groupId]/members
 *
 * Returns members belonging to a specific group (family, event, ministry, or custom list).
 */

import { NextResponse } from 'next/server';
import { getCurrentTenantId } from '@/lib/server/context';
import { createSupabaseServerClient as createClient } from '@/lib/supabase/server';

type RouteParams = {
  params: Promise<{
    source: string;
    groupId: string;
  }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const tenantId = await getCurrentTenantId();
    const { source, groupId } = await params;
    const supabase = await createClient();

    let members: Array<{
      id: string;
      source: string;
      sourceId: string;
      sourceName: string;
      name: string;
      email?: string;
      phone?: string;
    }> = [];

    switch (source) {
      case 'family': {
        // Get family account info
        const { data: account } = await supabase
          .from('accounts')
          .select('id, name')
          .eq('id', groupId)
          .eq('tenant_id', tenantId)
          .single();

        if (!account) {
          return NextResponse.json({ error: 'Family not found' }, { status: 404 });
        }

        // Get family members
        const { data: memberData } = await supabase
          .from('account_members')
          .select(`
            member:members(
              id,
              first_name,
              last_name,
              email,
              mobile_phone,
              home_phone
            )
          `)
          .eq('account_id', groupId);

        members = (memberData ?? [])
          .filter((m) => m.member)
          .map((m) => {
            const member = m.member as {
              id: string;
              first_name: string;
              last_name: string;
              email?: string;
              mobile_phone?: string;
              home_phone?: string;
            };
            return {
              id: member.id,
              source: 'member' as const,
              sourceId: groupId,
              sourceName: account.name,
              name: `${member.first_name} ${member.last_name}`.trim(),
              email: member.email ?? undefined,
              phone: member.mobile_phone ?? member.home_phone ?? undefined,
            };
          });
        break;
      }

      case 'event': {
        // Get event info
        const { data: event } = await supabase
          .from('schedules')
          .select('id, title')
          .eq('id', groupId)
          .eq('tenant_id', tenantId)
          .single();

        if (!event) {
          return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        // Get event registrations with member info
        const { data: registrations } = await supabase
          .from('registrations')
          .select(`
            member:members(
              id,
              first_name,
              last_name,
              email,
              mobile_phone,
              home_phone
            )
          `)
          .eq('schedule_id', groupId)
          .eq('tenant_id', tenantId);

        members = (registrations ?? [])
          .filter((r) => r.member)
          .map((r) => {
            const member = r.member as {
              id: string;
              first_name: string;
              last_name: string;
              email?: string;
              mobile_phone?: string;
              home_phone?: string;
            };
            return {
              id: member.id,
              source: 'member' as const,
              sourceId: groupId,
              sourceName: event.title,
              name: `${member.first_name} ${member.last_name}`.trim(),
              email: member.email ?? undefined,
              phone: member.mobile_phone ?? member.home_phone ?? undefined,
            };
          });
        break;
      }

      case 'ministry': {
        // Get ministry info
        const { data: ministry } = await supabase
          .from('ministries')
          .select('id, name')
          .eq('id', groupId)
          .eq('tenant_id', tenantId)
          .single();

        if (!ministry) {
          return NextResponse.json({ error: 'Ministry not found' }, { status: 404 });
        }

        // Get ministry members
        const { data: ministryMembers } = await supabase
          .from('ministry_members')
          .select(`
            member:members(
              id,
              first_name,
              last_name,
              email,
              mobile_phone,
              home_phone
            )
          `)
          .eq('ministry_id', groupId)
          .is('deleted_at', null);

        members = (ministryMembers ?? [])
          .filter((m) => m.member)
          .map((m) => {
            const member = m.member as {
              id: string;
              first_name: string;
              last_name: string;
              email?: string;
              mobile_phone?: string;
              home_phone?: string;
            };
            return {
              id: member.id,
              source: 'member' as const,
              sourceId: groupId,
              sourceName: ministry.name,
              name: `${member.first_name} ${member.last_name}`.trim(),
              email: member.email ?? undefined,
              phone: member.mobile_phone ?? member.home_phone ?? undefined,
            };
          });
        break;
      }

      case 'list': {
        // Custom lists would come from a communication_lists table (future feature)
        // For now, return empty array
        members = [];
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid source type' }, { status: 400 });
    }

    // Remove duplicates by member ID
    const uniqueMembers = members.reduce(
      (acc, member) => {
        if (!acc.seen.has(member.id)) {
          acc.seen.add(member.id);
          acc.result.push(member);
        }
        return acc;
      },
      { seen: new Set<string>(), result: [] as typeof members }
    ).result;

    return NextResponse.json({ members: uniqueMembers });
  } catch (error) {
    console.error('Failed to load group members:', error);
    return NextResponse.json(
      { error: 'Failed to load group members' },
      { status: 500 }
    );
  }
}
