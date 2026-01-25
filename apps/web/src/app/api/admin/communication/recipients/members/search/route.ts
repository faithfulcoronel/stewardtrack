/**
 * API Route: GET /api/admin/communication/recipients/members/search
 *
 * Search members by name or email.
 * Uses MemberRepository which handles PII field decryption.
 */

import { NextResponse } from 'next/server';
import { getCurrentTenantId } from '@/lib/server/context';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { IMemberRepository } from '@/repositories/member.repository';

export async function GET(request: Request) {
  try {
    // Ensure tenant context is available (required for repository)
    await getCurrentTenantId();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') ?? '';

    if (!query.trim()) {
      return NextResponse.json({ members: [] });
    }

    // Use MemberRepository which handles encryption/decryption
    const memberRepository = container.get<IMemberRepository>(TYPES.IMemberRepository);
    const result = await memberRepository.search(query.trim(), 20);

    // Transform to recipient format
    const recipients = result.data.map((member) => ({
      id: member.id,
      source: 'member' as const,
      name: `${member.first_name} ${member.last_name}`.trim(),
      email: member.email ?? undefined,
      phone: member.contact_number ?? undefined,
    }));

    return NextResponse.json({ members: recipients });
  } catch (error) {
    console.error('Member search failed:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}
