import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { UserMemberLinkService } from '@/services/UserMemberLinkService';
import { authUtils } from '@/utils/authUtils';

// POST /api/member-invitations/accept - Accept member invitation
export async function POST(request: NextRequest) {
  try {
    const user = await authUtils.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'token is required' },
        { status: 400 }
      );
    }

    const userMemberLinkService = container.get<UserMemberLinkService>(TYPES.UserMemberLinkService);

    // Get client IP and user agent for audit trail
    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIp = forwardedFor ? forwardedFor.split(',')[0] : request.headers.get('x-real-ip');
    const userAgent = request.headers.get('user-agent');

    const result = await userMemberLinkService.acceptInvitation(
      token,
      user.id,
      clientIp || undefined,
      userAgent || undefined
    );

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/member-invitations/accept - Get invitation details by token (for invitation page)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'token parameter is required' },
        { status: 400 }
      );
    }

    const userMemberLinkService = container.get<UserMemberLinkService>(TYPES.UserMemberLinkService);

    const invitation = await userMemberLinkService.getInvitationByToken(token);

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation token' },
        { status: 404 }
      );
    }

    // Check if invitation is still valid
    if (invitation.status !== 'pending' && invitation.status !== 'sent') {
      return NextResponse.json(
        {
          error: 'Invitation is no longer valid',
          status: invitation.status,
          accepted_at: invitation.accepted_at,
          revoked_at: invitation.revoked_at
        },
        { status: 400 }
      );
    }

    // Check if invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        {
          error: 'Invitation has expired',
          expires_at: invitation.expires_at
        },
        { status: 400 }
      );
    }

    // Return invitation details (without sensitive token)
    const { token: _, ...invitationDetails } = invitation;

    return NextResponse.json({
      invitation: invitationDetails,
      valid: true
    });
  } catch (error) {
    console.error('Error fetching invitation by token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}