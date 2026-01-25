/**
 * API Route: GET /api/admin/communication/recipients/members
 *
 * Returns a list of members that can be selected as recipients.
 * Uses the MemberRepository which handles PII field decryption.
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
    const limit = parseInt(searchParams.get('limit') ?? '50', 10);

    // Use MemberRepository which handles encryption/decryption
    const memberRepository = container.get<IMemberRepository>(TYPES.IMemberRepository);

    // Fetch members - tenant filtering is handled automatically by buildSecureQuery
    // No need to pass tenant_id in filters as it's auto-applied
    const result = await memberRepository.find({
      select: 'id, first_name, last_name, email, contact_number',
      order: { column: 'last_name', ascending: true },
      pagination: { page: 1, pageSize: limit },
    });

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
    console.error('Failed to load members:', error);
    return NextResponse.json(
      { error: 'Failed to load members' },
      { status: 500 }
    );
  }
}
