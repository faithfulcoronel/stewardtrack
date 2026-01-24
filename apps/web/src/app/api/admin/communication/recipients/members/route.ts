/**
 * API Route: GET /api/admin/communication/recipients/members
 *
 * Returns a list of members that can be selected as recipients.
 * Uses the MemberAdapter which handles PII field decryption.
 */

import { NextResponse } from 'next/server';
import { getCurrentTenantId } from '@/lib/server/context';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { IMemberAdapter } from '@/adapters/member.adapter';

export async function GET(request: Request) {
  try {
    // Ensure tenant context is available (required for adapter)
    await getCurrentTenantId();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') ?? '50', 10);

    // Use MemberAdapter which handles encryption/decryption
    const memberAdapter = container.get<IMemberAdapter>(TYPES.IMemberAdapter);

    // Fetch members - tenant filtering is handled automatically by buildSecureQuery
    // No need to pass tenant_id in filters as it's auto-applied
    const result = await memberAdapter.fetch({
      select: 'id, first_name, last_name, email, mobile_phone, home_phone',
      order: { column: 'last_name', ascending: true },
      pagination: { page: 1, pageSize: limit },
    });

    // Transform to recipient format
    const recipients = result.data.map((member) => ({
      id: member.id,
      source: 'member' as const,
      name: `${member.first_name} ${member.last_name}`.trim(),
      email: member.email ?? undefined,
      phone: member.mobile_phone ?? member.home_phone ?? undefined,
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
