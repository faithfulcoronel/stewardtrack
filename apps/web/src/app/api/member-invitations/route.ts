import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { UserMemberLinkService } from '@/services/UserMemberLinkService';
import { authUtils } from '@/utils/authUtils';
import { tenantUtils } from '@/utils/tenantUtils';

// GET /api/member-invitations - Get member invitations
export async function GET(request: NextRequest) {
  try {
    const user = await authUtils.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status') as 'pending' | 'sent' | 'accepted' | 'expired' | 'revoked' | null;
    const memberId = searchParams.get('member_id') || undefined;
    const invitedBy = searchParams.get('invited_by') || undefined;
    const dateFrom = searchParams.get('date_from') || undefined;
    const dateTo = searchParams.get('date_to') || undefined;

    const userMemberLinkService = container.get<UserMemberLinkService>(TYPES.UserMemberLinkService);

    const invitations = await userMemberLinkService.getInvitations(
      tenantId,
      Math.min(limit, 100), // Cap at 100 for performance
      offset,
      {
        status: status || undefined,
        member_id: memberId,
        invited_by: invitedBy,
        date_from: dateFrom,
        date_to: dateTo
      }
    );

    return NextResponse.json({
      invitations,
      limit,
      offset,
      filters: {
        status,
        member_id: memberId,
        invited_by: invitedBy,
        date_from: dateFrom,
        date_to: dateTo
      }
    });
  } catch (error) {
    console.error('Error fetching member invitations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/member-invitations - Create member invitation
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
    const { member_id, email, invitation_type, expires_in_days, notes } = body;

    if (!member_id || !email) {
      return NextResponse.json(
        { error: 'member_id and email are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const userMemberLinkService = container.get<UserMemberLinkService>(TYPES.UserMemberLinkService);

    const result = await userMemberLinkService.createMemberInvitation(
      {
        member_id,
        email,
        invitation_type: invitation_type || 'email',
        expires_in_days: expires_in_days || 7,
        notes
      },
      user.id,
      tenantId
    );

    if (result.success) {
      return NextResponse.json(result, { status: 201 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Error creating member invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}