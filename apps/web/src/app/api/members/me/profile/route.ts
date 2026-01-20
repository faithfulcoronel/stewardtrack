import { NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { authUtils } from '@/utils/authUtils';
import { tenantUtils } from '@/utils/tenantUtils';
import type { UserMemberLinkRepository } from '@/repositories/userMemberLink.repository';
import type { IMemberRepository } from '@/repositories/member.repository';

/**
 * GET /api/members/me/profile
 * Get the profile of the currently authenticated member
 * Used by public donation form to identify authenticated donors
 */
export async function GET() {
  try {
    const user = await authUtils.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const tenantId = await tenantUtils.getTenantId();

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'No tenant context' },
        { status: 404 }
      );
    }

    const userMemberLinkRepo = container.get<UserMemberLinkRepository>(
      TYPES.UserMemberLinkRepository
    );
    const memberRepo = container.get<IMemberRepository>(
      TYPES.IMemberRepository
    );

    // Get the member linked to this user
    const linkedMember = await userMemberLinkRepo.getMemberByUserId(
      user.id,
      tenantId
    );

    if (!linkedMember) {
      return NextResponse.json(
        { success: false, error: 'Member profile not found' },
        { status: 404 }
      );
    }

    // Get full member record
    const member = await memberRepo.findById(linkedMember.id, tenantId);

    if (!member) {
      return NextResponse.json(
        { success: false, error: 'Member profile not found' },
        { status: 404 }
      );
    }

    // Build full name
    const fullName = [member.first_name, member.last_name]
      .filter(Boolean)
      .join(' ');

    return NextResponse.json({
      success: true,
      data: {
        id: member.id,
        first_name: member.first_name,
        last_name: member.last_name,
        full_name: fullName,
        email: member.email,
        phone: member.mobile_phone,
        mobile_phone: member.mobile_phone,
        status: member.status,
      },
    });
  } catch (error) {
    console.error('[API] Error fetching member profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch member profile' },
      { status: 500 }
    );
  }
}
