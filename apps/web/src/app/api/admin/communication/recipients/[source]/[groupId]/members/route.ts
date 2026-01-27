/**
 * API Route: GET /api/admin/communication/recipients/[source]/[groupId]/members
 *
 * Returns members belonging to a specific group (family, event, ministry, registrant, or custom list).
 * Uses MemberRepository for data access to ensure proper encryption/decryption of PII fields.
 * For registrant source, includes both member registrants and guest registrants.
 * @requires communication:view permission
 */

import { NextResponse } from 'next/server';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';
import { PermissionGate } from '@/lib/access-gate';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { IMemberRepository } from '@/repositories/member.repository';
import type { IAccountRepository } from '@/repositories/account.repository';
import type { ISchedulerService } from '@/services/SchedulerService';
import type { IMinistryRepository } from '@/repositories/ministry.repository';
import type { IScheduleRegistrationRepository } from '@/repositories/scheduleRegistration.repository';

type RouteParams = {
  params: Promise<{
    source: string;
    groupId: string;
  }>;
};

/**
 * GET /api/admin/communication/recipients/[source]/[groupId]/members
 *
 * Get members for a specific group
 * @requires communication:view permission
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const tenantId = await getCurrentTenantId();
    const userId = await getCurrentUserId();

    // Check permission using PermissionGate (single source of truth)
    const permissionGate = new PermissionGate('communication:view', 'all');
    const accessResult = await permissionGate.check(userId, tenantId);

    if (!accessResult.allowed) {
      return NextResponse.json(
        { success: false, error: accessResult.reason || 'Permission denied' },
        { status: 403 }
      );
    }

    const { source, groupId } = await params;

    // Get repositories/services from DI container
    const memberRepository = container.get<IMemberRepository>(TYPES.IMemberRepository);
    const accountRepository = container.get<IAccountRepository>(TYPES.IAccountRepository);
    const schedulerService = container.get<ISchedulerService>(TYPES.SchedulerService);
    const ministryRepository = container.get<IMinistryRepository>(TYPES.IMinistryRepository);

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
        // Get family account info using repository
        const account = await accountRepository.findById(groupId);
        if (!account) {
          return NextResponse.json({ error: 'Family not found' }, { status: 404 });
        }

        // Get family members using repository
        const memberResult = await memberRepository.findByAccount(groupId, {
          select: 'id, first_name, last_name, email, contact_number',
          order: { column: 'last_name', ascending: true },
        });

        members = memberResult.data.map((member) => ({
          id: member.id,
          source: 'member' as const,
          sourceId: groupId,
          sourceName: account.name ?? 'Unknown Family',
          name: `${member.first_name} ${member.last_name}`.trim(),
          email: member.email ?? undefined,
          phone: member.contact_number ?? undefined,
        }));
        break;
      }

      case 'event': {
        // Get event info using scheduler service
        const event = await schedulerService.getById(groupId, tenantId);
        if (!event) {
          return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        // Get registered members for the event
        const memberResult = await memberRepository.findByScheduleRegistration(groupId, {
          select: 'id, first_name, last_name, email, contact_number',
          order: { column: 'last_name', ascending: true },
        });

        members = memberResult.data.map((member) => ({
          id: member.id,
          source: 'member' as const,
          sourceId: groupId,
          sourceName: event.name ?? 'Unknown Event',
          name: `${member.first_name} ${member.last_name}`.trim(),
          email: member.email ?? undefined,
          phone: member.contact_number ?? undefined,
        }));
        break;
      }

      case 'ministry': {
        // Get ministry info using repository
        const ministry = await ministryRepository.findById(groupId);
        if (!ministry) {
          return NextResponse.json({ error: 'Ministry not found' }, { status: 404 });
        }

        // Get ministry members using repository
        const memberResult = await memberRepository.findByMinistry(groupId, {
          select: 'id, first_name, last_name, email, contact_number',
          order: { column: 'last_name', ascending: true },
        });

        members = memberResult.data.map((member) => ({
          id: member.id,
          source: 'member' as const,
          sourceId: groupId,
          sourceName: ministry.name ?? 'Unknown Ministry',
          name: `${member.first_name} ${member.last_name}`.trim(),
          email: member.email ?? undefined,
          phone: member.contact_number ?? undefined,
        }));
        break;
      }

      case 'registrant': {
        // Get event info using scheduler service
        const schedule = await schedulerService.getById(groupId, tenantId);
        if (!schedule) {
          return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        // Direct Supabase query to get registrations with member data via occurrences
        const { createSupabaseServerClient } = await import('@/lib/supabase/server');
        const supabase = await createSupabaseServerClient();

        // Query registrations joined with occurrences to filter by schedule_id
        // Also join member data for member registrants
        const { data: registrations, error: regError } = await supabase
          .from('schedule_registrations')
          .select(`
            id,
            member_id,
            guest_name,
            guest_email,
            guest_phone,
            status,
            occurrence:schedule_occurrences!inner(
              id,
              schedule_id
            ),
            member:members!member_id(
              id,
              first_name,
              last_name,
              email,
              contact_number
            )
          `)
          .eq('tenant_id', tenantId)
          .eq('occurrence.schedule_id', groupId)
          .in('status', ['registered', 'waitlisted', 'checked_in'])
          .order('registration_date', { ascending: true });

        if (regError) {
          console.error('Failed to fetch registrations:', regError);
          return NextResponse.json({ error: 'Failed to load registrations' }, { status: 500 });
        }

        // Track seen member IDs and guest emails to avoid duplicates
        const seenMemberIds = new Set<string>();
        const seenGuestEmails = new Set<string>();

        // Process registrations - members get their full data, guests use registration data
        for (const reg of (registrations ?? [])) {
          const memberData = reg.member as { id: string; first_name: string; last_name: string; email?: string | null; contact_number?: string | null } | null;

          if (reg.member_id && memberData) {
            // Member registrant - use member data
            // Note: PII is NOT decrypted here since we're using direct Supabase query
            // For encrypted member data, we'd need to use MemberRepository
            if (!seenMemberIds.has(reg.member_id)) {
              seenMemberIds.add(reg.member_id);
              members.push({
                id: reg.member_id,
                source: 'registrant' as const,
                sourceId: groupId,
                sourceName: schedule.name ?? 'Unknown Event',
                name: `${memberData.first_name ?? ''} ${memberData.last_name ?? ''}`.trim() || 'Unknown Member',
                email: memberData.email ?? undefined,
                phone: memberData.contact_number ?? undefined,
              });
            }
          } else if (reg.guest_name || reg.guest_email) {
            // Guest registrant - use registration data directly
            const guestKey = reg.guest_email || reg.id;
            if (!seenGuestEmails.has(guestKey)) {
              seenGuestEmails.add(guestKey);
              members.push({
                id: `guest-${reg.id}`,
                source: 'registrant' as const,
                sourceId: groupId,
                sourceName: schedule.name ?? 'Unknown Event',
                name: reg.guest_name || 'Guest',
                email: reg.guest_email ?? undefined,
                phone: reg.guest_phone ?? undefined,
              });
            }
          }
        }

        // If member data needs decryption, fetch members separately via repository
        // This ensures proper PII handling for member registrants
        if (seenMemberIds.size > 0) {
          const memberIds = Array.from(seenMemberIds);
          const memberResult = await memberRepository.find({
            filters: { id: { operator: 'in', value: memberIds } },
            select: 'id, first_name, last_name, email, contact_number',
          });

          // Update member data with decrypted info
          const memberMap = new Map(
            memberResult.data.map(m => [m.id, m])
          );

          members = members.map(r => {
            if (r.source === 'registrant' && !r.id.startsWith('guest-')) {
              const decryptedMember = memberMap.get(r.id);
              if (decryptedMember) {
                return {
                  ...r,
                  name: `${decryptedMember.first_name ?? ''} ${decryptedMember.last_name ?? ''}`.trim() || r.name,
                  email: decryptedMember.email ?? r.email,
                  phone: decryptedMember.contact_number ?? r.phone,
                };
              }
            }
            return r;
          });
        }
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
