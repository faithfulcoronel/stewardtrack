import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { UserMemberLinkService } from '@/services/UserMemberLinkService';
import { authUtils } from '@/utils/authUtils';
import { tenantUtils } from '@/utils/tenantUtils';

// POST /api/member-invitations/bulk - Bulk create member invitations
export async function POST(request: NextRequest) {
  try {
    const user = await authUtils.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 });
    }

    const body = await request.json();
    const { member_ids, invitation_type, expires_in_days, notes } = body;

    if (!Array.isArray(member_ids) || member_ids.length === 0) {
      return NextResponse.json(
        { error: 'member_ids array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Limit bulk operations to prevent abuse
    if (member_ids.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 invitations allowed per bulk operation' },
        { status: 400 }
      );
    }

    const userMemberLinkService = container.get<UserMemberLinkService>(TYPES.UserMemberLinkService);

    // Validate security constraints
    const securityValidation = await userMemberLinkService.validateInvitationSecurity(
      member_ids,
      tenantId
    );

    if (!securityValidation.isValid) {
      return NextResponse.json(
        {
          error: 'Security validation failed',
          violations: securityValidation.violations,
          recommendations: securityValidation.recommendations
        },
        { status: 400 }
      );
    }

    const result = await userMemberLinkService.bulkCreateInvitations(
      {
        member_ids,
        invitation_type: invitation_type || 'email',
        expires_in_days: expires_in_days || 7,
        notes
      },
      user.id,
      tenantId
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error bulk creating member invitations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}