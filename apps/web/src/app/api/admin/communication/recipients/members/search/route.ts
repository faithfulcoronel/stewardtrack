/**
 * API Route: GET /api/admin/communication/recipients/members/search
 *
 * Search members by name or email.
 * Uses MemberRepository which handles PII field decryption.
 * @requires communication:view permission
 */

import { NextResponse } from 'next/server';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';
import { PermissionGate } from '@/lib/access-gate';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { IMemberRepository } from '@/repositories/member.repository';

export async function GET(request: Request) {
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
