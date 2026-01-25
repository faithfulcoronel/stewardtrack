/**
 * API Route: GET /api/admin/communication/recipients/[source]/[groupId]/members
 *
 * Returns members belonging to a specific group (family, event, ministry, or custom list).
 * Uses MemberRepository for data access to ensure proper encryption/decryption of PII fields.
 */

import { NextResponse } from 'next/server';
import { getCurrentTenantId } from '@/lib/server/context';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { IMemberRepository } from '@/repositories/member.repository';
import type { IAccountRepository } from '@/repositories/account.repository';
import type { ISchedulerService } from '@/services/SchedulerService';
import type { IMinistryRepository } from '@/repositories/ministry.repository';

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
